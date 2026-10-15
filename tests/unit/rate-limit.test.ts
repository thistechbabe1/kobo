import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as resolvePOST } from '@/app/api/wallet/resolve-account/route';
import { POST as transferPOST } from '@/app/api/wallet/transfer/route';
import {
  checkRateLimitDetailed,
  resetRateLimitStore,
} from '@/lib/rate-limit';
import { sealAuthToken, AUTH_COOKIE_NAME } from '@/lib/session';

describe('API Rate Limiting with Retry-After (feature/rate-limiting)', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  describe('Core Rate Limiter Utility', () => {
    it('allows requests within the limit and reports correct remaining count', () => {
      const res1 = checkRateLimitDetailed('test-key', 2, 60000);
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(1);
      expect(res1.retryAfterSeconds).toBe(0);

      const res2 = checkRateLimitDetailed('test-key', 2, 60000);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(0);
      expect(res2.retryAfterSeconds).toBe(0);
    });

    it('rejects requests over limit and returns non-zero retryAfterSeconds', () => {
      checkRateLimitDetailed('test-key-2', 1, 60000);
      const resBlocked = checkRateLimitDetailed('test-key-2', 1, 60000);
      expect(resBlocked.success).toBe(false);
      expect(resBlocked.remaining).toBe(0);
      expect(resBlocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(resBlocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it('getClientIp trusts x-real-ip, uses LAST x-forwarded-for entry, and returns distinct fallbacks when headers are absent', async () => {
      const { getClientIp } = await import('@/lib/rate-limit');

      // Prioritizes x-real-ip
      const reqWithRealIp = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'x-real-ip': '203.0.113.195',
          'x-forwarded-for': '198.51.100.1, 198.51.100.2',
        },
      });
      expect(getClientIp(reqWithRealIp)).toBe('203.0.113.195');

      // Takes LAST entry in x-forwarded-for when x-real-ip is not present
      const reqWithForwarded = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'x-forwarded-for': 'client.spoofed.ip, proxy1.ip, 198.51.100.50',
        },
      });
      expect(getClientIp(reqWithForwarded)).toBe('198.51.100.50');

      // Distinct fallbacks when no headers exist (does not lump all into a single shared bucket)
      const reqEmpty1 = new NextRequest('http://localhost:3000/api/auth/login');
      const reqEmpty2 = new NextRequest('http://localhost:3000/api/auth/login');
      const ip1 = getClientIp(reqEmpty1);
      const ip2 = getClientIp(reqEmpty2);
      expect(ip1).toMatch(/^unknown-/);
      expect(ip2).toMatch(/^unknown-/);
      expect(ip1).not.toBe(ip2);
    });
  });

  describe('POST /api/auth/login Rate Limiting & Validation', () => {
    it('enforces dual rate limiting: IP limit blocks requests even if emails differ', async () => {
      const makeReq = (email: string) =>
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'x-real-ip': '198.51.100.77',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email, password: 'wrong' }),
        });

      // 10 requests from same IP with different emails
      for (let i = 0; i < 10; i++) {
        const res = await loginPOST(makeReq(`user${i}@kobo.demo`));
        expect(res.status).not.toBe(429);
      }

      // 11th request from the same IP must be blocked by the IP-level rate limit
      const blockedRes = await loginPOST(makeReq('user99@kobo.demo'));
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers.get('Retry-After')).toBeTruthy();
    });

    it('enforces dual rate limiting: IP + lowercased email limit blocks same email within budget', async () => {
      const makeReq = (ip: string, email: string) =>
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'x-real-ip': ip,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email, password: 'wrong' }),
        });

      // 10 attempts for user with mixed casing
      for (let i = 0; i < 10; i++) {
        const res = await loginPOST(makeReq('192.168.1.100', 'Babatunde@Kobo.demo'));
        expect(res.status).not.toBe(429);
      }

      // 11th attempt with lowercased email is blocked by the IP+email limit
      const blockedRes = await loginPOST(makeReq('192.168.1.100', 'babatunde@kobo.demo'));
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers.get('Retry-After')).toBeTruthy();
    });

    it('handles malformed JSON payload by returning 400 with INVALID_INPUT, not 500', async () => {
      const malformedReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'x-real-ip': '192.168.1.120',
          'content-type': 'application/json',
        },
        body: '{"email": "babatunde@kobo.demo", password: invalid-json',
      });

      const res = await loginPOST(malformedReq);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_INPUT');
      expect(data.error).toMatch(/Invalid JSON|Malformed/i);
    });
  });

  describe('POST /api/wallet/resolve-account Rate Limiting', () => {
    it('returns 429 with Retry-After header after 30 lookups from the same IP', async () => {
      const makeReq = () =>
        new NextRequest('http://localhost:3000/api/wallet/resolve-account', {
          method: 'POST',
          headers: {
            'x-forwarded-for': '192.168.1.101',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ accountNumber: '0123456789', bankCode: '058' }),
        });

      // Exhaust 30 allowed requests
      for (let i = 0; i < 30; i++) {
        const res = await resolvePOST(makeReq());
        expect(res.status).toBe(200);
      }

      // 31st request must receive 429
      const blockedRes = await resolvePOST(makeReq());
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers.get('Retry-After')).toBeTruthy();
      expect(Number(blockedRes.headers.get('Retry-After'))).toBeGreaterThan(0);
    });
  });

  describe('POST /api/wallet/transfer Rate Limiting', () => {
    it('returns 429 with Retry-After header after 20 transfers by the same user', async () => {
      const authToken = await sealAuthToken({
        sub: 'usr_rate_limit_test',
        email: 'tester@kobo.demo',
        name: 'Rate Limit Tester',
      });

      const makeReq = (idx: number) =>
        new NextRequest('http://localhost:3000/api/wallet/transfer', {
          method: 'POST',
          headers: {
            cookie: `${AUTH_COOKIE_NAME}=${authToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            accountNumber: '0123456789',
            bankCode: '058',
            recipientName: 'Chioma Adebayo',
            amountKobo: 100000,
            pin: '1234',
            idempotencyKey: `idem-key-rate-${idx}`,
          }),
        });

      // Exhaust 20 allowed requests
      for (let i = 0; i < 20; i++) {
        const res = await transferPOST(makeReq(i));
        expect(res.status).not.toBe(429);
      }

      // 21st request must receive 429
      const blockedRes = await transferPOST(makeReq(20));
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers.get('Retry-After')).toBeTruthy();
      expect(Number(blockedRes.headers.get('Retry-After'))).toBeGreaterThan(0);
    });
  });
});

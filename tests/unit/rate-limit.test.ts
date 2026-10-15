import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as resolvePOST } from '@/app/api/wallet/resolve-account/route';
import { POST as transferPOST } from '@/app/api/wallet/transfer/route';
import {
  checkRateLimitDetailed,
  resetRateLimitStore,
  evictExpiredEntries,
  getRateLimitStoreSize,
  getClientIp,
} from '@/lib/rate-limit';
import { sealAuthToken, AUTH_COOKIE_NAME } from '@/lib/session';

describe('API Rate Limiting with Retry-After (feature/rate-limiting)', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  describe('Core Rate Limiter Utility & Eviction', () => {
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

    it('evicts expired entries from in-memory store when window elapses', () => {
      // Add entry expiring at now + 500ms
      checkRateLimitDetailed('temp-key-1', 5, 500);
      checkRateLimitDetailed('temp-key-2', 5, 500);
      // Add entry expiring at now + 60000ms
      checkRateLimitDetailed('long-key', 5, 60000);

      expect(getRateLimitStoreSize()).toBe(3);

      // Advance time past 500ms but before 60000ms
      const future = Date.now() + 600;
      const evicted = evictExpiredEntries(future);
      expect(evicted).toBe(2);
      expect(getRateLimitStoreSize()).toBe(1);
    });

    it('getClientIp trusts x-real-ip, uses LAST x-forwarded-for entry, and falls back to shared unknown', () => {
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

      // Shared fallback to 'unknown' when no header is present
      const reqEmpty = new NextRequest('http://localhost:3000/api/auth/login');
      expect(getClientIp(reqEmpty)).toBe('unknown');
    });
  });

  describe('POST /api/auth/login Rate Limiting & Validation', () => {
    const originalEnv = process.env.NODE_ENV;
    afterEach(() => {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    });

    it('Item 1a: IP-level limit trips independently at 40 requests/min across different emails', async () => {
      const makeReq = (email: string) =>
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'x-real-ip': '198.51.100.10',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email, password: 'wrong' }),
        });

      // 40 distinct emails from the same IP (none hits the 8/min IP+email or 15/min email-only limit)
      for (let i = 0; i < 40; i++) {
        const res = await loginPOST(makeReq(`distinct_user_${i}@kobo.demo`));
        expect(res.status).not.toBe(429);
      }

      // 41st request from same IP must be blocked by the IP limit
      const blockedRes = await loginPOST(makeReq('distinct_user_41@kobo.demo'));
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.error).toMatch(/network/i);
    });

    it('Item 1b: IP+email limit trips independently at 8 requests/min', async () => {
      const makeReq = (ip: string, email: string) =>
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'x-real-ip': ip,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email, password: 'wrong' }),
        });

      // 8 requests for user_alpha from IP A
      for (let i = 0; i < 8; i++) {
        const res = await loginPOST(makeReq('192.168.10.1', 'Alpha@Kobo.demo'));
        expect(res.status).not.toBe(429);
      }

      // 9th request for user_alpha from IP A must trip 429 (IP+email limit)
      const blockedRes = await loginPOST(makeReq('192.168.10.1', 'alpha@kobo.demo'));
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');

      // But IP B for the same user is NOT blocked yet by IP+email
      const differentIpRes = await loginPOST(makeReq('192.168.10.2', 'alpha@kobo.demo'));
      expect(differentIpRes.status).not.toBe(429);
    });

    it('Item 1c: Email-only limit trips independently at 15 requests/min across multiple IPs', async () => {
      const makeReq = (ipIndex: number) =>
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'x-real-ip': `10.0.0.${ipIndex}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email: 'distributed_target@kobo.demo', password: 'wrong' }),
        });

      // 15 requests from 15 completely different IPs (each IP only has 1 request, so IP limit 40 and IP+email 8 never trip)
      for (let i = 1; i <= 15; i++) {
        const res = await loginPOST(makeReq(i));
        expect(res.status).not.toBe(429);
      }

      // 16th request from a 16th IP must be blocked by the email-only cross-network limit
      const blockedRes = await loginPOST(makeReq(16));
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.error).toMatch(/across networks/i);
    });

    it('Item 2: rejects unknown IP in production with 429', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const reqEmpty = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'test@kobo.demo', password: 'wrong' }),
      });

      const res = await loginPOST(reqEmpty);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.code).toBe('IP_REQUIRED');
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

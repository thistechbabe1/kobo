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
  });

  describe('POST /api/auth/login Rate Limiting', () => {
    it('returns 429 with Retry-After header after 10 requests from the same IP', async () => {
      const makeReq = () =>
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'x-forwarded-for': '192.168.1.100',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email: 'babatunde@kobo.demo', password: 'wrong' }),
        });

      // Exhaust 10 allowed attempts
      for (let i = 0; i < 10; i++) {
        const res = await loginPOST(makeReq());
        expect(res.status).not.toBe(429);
      }

      // 11th request must receive 429
      const blockedRes = await loginPOST(makeReq());
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers.get('Retry-After')).toBeTruthy();
      expect(Number(blockedRes.headers.get('Retry-After'))).toBeGreaterThan(0);
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

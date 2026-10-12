import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as resolvePOST } from '@/app/api/wallet/resolve-account/route';
import { POST as transferPOST } from '@/app/api/wallet/transfer/route';
import { DELETE as beneficiaryDELETE } from '@/app/api/wallet/beneficiaries/route';
import { sealAuthToken, AUTH_COOKIE_NAME } from '@/lib/session';

describe('Zod Validation on API Routes', () => {
  describe('POST /api/auth/login', () => {
    it('returns 400 when body is empty or non-JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid-json',
      });
      const res = await loginPOST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('returns 400 when email format is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
      });
      const res = await loginPOST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Invalid email address format/i);
    });

    it('returns 400 when password is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      });
      const res = await loginPOST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Password is required/i);
    });
  });

  describe('POST /api/wallet/resolve-account', () => {
    it('returns 400 when accountNumber is not 10 digits', async () => {
      const req = new NextRequest('http://localhost:3000/api/wallet/resolve-account', {
        method: 'POST',
        body: JSON.stringify({ accountNumber: '12345', bankCode: '058' }),
      });
      const res = await resolvePOST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Account number must be exactly 10 digits/i);
    });

    it('returns 400 when bankCode is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/wallet/resolve-account', {
        method: 'POST',
        body: JSON.stringify({ accountNumber: '0123456789' }),
      });
      const res = await resolvePOST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Bank selection is required/i);
    });
  });

  describe('POST /api/wallet/transfer', () => {
    it('returns 400 when PIN is not 4 digits', async () => {
      const authToken = await sealAuthToken({
        sub: 'usr_test_001',
        email: 'test@kobo.demo',
        name: 'Test User',
      });

      const req = new NextRequest('http://localhost:3000/api/wallet/transfer', {
        method: 'POST',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${authToken}`,
        },
        body: JSON.stringify({
          accountNumber: '0123456789',
          bankCode: '058',
          recipientName: 'Chioma Adebayo',
          amountKobo: 500000,
          pin: '12', // Invalid: only 2 digits
          idempotencyKey: 'idem-key-test-pin',
        }),
      });

      const res = await transferPOST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/PIN must be exactly 4 digits/i);
    });

    it('returns 400 when amount is not a positive integer', async () => {
      const authToken = await sealAuthToken({
        sub: 'usr_test_001',
        email: 'test@kobo.demo',
        name: 'Test User',
      });

      const req = new NextRequest('http://localhost:3000/api/wallet/transfer', {
        method: 'POST',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${authToken}`,
        },
        body: JSON.stringify({
          accountNumber: '0123456789',
          bankCode: '058',
          recipientName: 'Chioma Adebayo',
          amountKobo: -100, // Invalid: negative
          pin: '1234',
          idempotencyKey: 'idem-key-test-amt',
        }),
      });

      const res = await transferPOST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Transfer amount must be a positive integer in Kobo/i);
    });

    it('returns 400 when idempotencyKey is missing', async () => {
      const authToken = await sealAuthToken({
        sub: 'usr_test_001',
        email: 'test@kobo.demo',
        name: 'Test User',
      });

      const req = new NextRequest('http://localhost:3000/api/wallet/transfer', {
        method: 'POST',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${authToken}`,
        },
        body: JSON.stringify({
          accountNumber: '0123456789',
          bankCode: '058',
          recipientName: 'Chioma Adebayo',
          amountKobo: 500000,
          pin: '1234',
        }),
      });

      const res = await transferPOST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Idempotency-Key is required/i);
    });
  });

  describe('DELETE /api/wallet/beneficiaries query validation', () => {
    it('returns 400 when id query parameter is empty or missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'usr_test_001',
        },
      });

      const res = await beneficiaryDELETE(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Beneficiary ID is required/i);
    });
  });
});

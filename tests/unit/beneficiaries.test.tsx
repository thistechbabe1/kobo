// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  SEEDED_BENEFICIARIES,
  getSavedBeneficiaries,
  persistBeneficiary,
  removeBeneficiary,
  toCompactBeneficiary,
  fromCompactBeneficiary,
  Beneficiary,
  DEFAULT_USER_ID,
  MAX_BENEFICIARIES_CAP,
} from '@/lib/beneficiaries';
import { BeneficiaryRail } from '@/components/send/BeneficiaryRail';
import { SendMoneyFlow } from '@/components/send/SendMoneyFlow';
import {
  COOKIE_NAME,
  CompactSessionPayload,
  sealSessionState,
} from '@/lib/session';
import { GET, POST, DELETE } from '@/app/api/wallet/beneficiaries/route';
import { resetRateLimitStore } from '@/lib/beneficiaries-server';
import { NextRequest } from 'next/server';

const mockBaseState: CompactSessionPayload = {
  bal: 24585050,
  pin: 0,
  loc: null,
  txs: [],
  ik: [],
  ben: [],
};

describe('Saved Beneficiaries (Feature 1) - Option A Cookie-Backed Architecture', () => {
  describe('lib/beneficiaries pure helpers & compact mapping', () => {
    it('returns default seeded beneficiaries when no session state is provided', () => {
      const list = getSavedBeneficiaries();
      expect(list).toHaveLength(3);
      expect(list[0].recipientName).toBe('Amina Bello');
      expect(list[1].recipientName).toBe('Folake Adeleke');
      expect(list[2].recipientName).toBe('Ibrahim Musa');
    });

    it('converts bidirectionally between Beneficiary and CompactBeneficiary', () => {
      const original: Beneficiary = {
        id: 'ben_test_1',
        userId: 'usr_custom_99',
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'Guaranty Trust Bank (GTBank)',
        bankShortName: 'GTB',
        recipientName: 'Kemi Adeyemi',
        nickname: 'My Sis',
        lastUsedAt: 1775736000000,
      };

      const compact = toCompactBeneficiary(original);
      expect(compact.a).toBe('0123456789');
      expect(compact.b).toBe('058');
      expect(compact.r).toBe('Kemi Adeyemi');
      expect(compact.u).toBe('usr_custom_99');

      const restored = fromCompactBeneficiary(compact);
      expect(restored.accountNumber).toBe(original.accountNumber);
      expect(restored.recipientName).toBe(original.recipientName);
      expect(restored.userId).toBe('usr_custom_99');
      expect(restored.nickname).toBe('My Sis');
    });

    it('persists a new beneficiary and prepends to the list', () => {
      const updated = persistBeneficiary(
        {
          accountNumber: '1122334455',
          bankCode: '058',
          bankName: 'Guaranty Trust Bank (GTBank)',
          bankShortName: 'GTB',
          recipientName: 'Chidi Mokeme',
        },
        SEEDED_BENEFICIARIES
      );

      expect(updated[0].recipientName).toBe('Chidi Mokeme');
      expect(updated[0].accountNumber).toBe('1122334455');
      expect(updated.length).toBe(4);
    });

    it('updates existing beneficiary lastUsedAt when re-saved', () => {
      const updated = persistBeneficiary(
        {
          accountNumber: '0000000010',
          bankCode: '058',
          bankName: 'Guaranty Trust Bank (GTBank)',
          bankShortName: 'GTB',
          recipientName: 'Amina Bello (Updated)',
        },
        SEEDED_BENEFICIARIES
      );

      expect(updated[0].accountNumber).toBe('0000000010');
      expect(updated[0].recipientName).toBe('Amina Bello (Updated)');
      expect(updated.length).toBe(3); // Deduplicated
    });

    it('removes a beneficiary by id from the list', () => {
      const afterRemoval = removeBeneficiary('ben_1', SEEDED_BENEFICIARIES);
      expect(afterRemoval.some((b) => b.id === 'ben_1')).toBe(false);
      expect(afterRemoval).toHaveLength(2);
    });

    it('enforces MAX_BENEFICIARIES_CAP = 5 in persistBeneficiary', () => {
      let list: Beneficiary[] = [];
      for (let i = 1; i <= 5; i++) {
        list = persistBeneficiary(
          {
            accountNumber: `000000000${i}`,
            bankCode: '058',
            bankName: 'GTBank',
            recipientName: `User ${i}`,
          },
          list
        );
      }
      expect(list).toHaveLength(5);

      expect(() => {
        persistBeneficiary(
          {
            accountNumber: '0000000006',
            bankCode: '058',
            bankName: 'GTBank',
            recipientName: 'User 6',
          },
          list
        );
      }).toThrow(/Maximum beneficiary cap of 5 reached/i);
    });
  });

  describe('BeneficiaryRail Component', () => {
    it('renders quick send chips with accessible labels', () => {
      const mockSelect = vi.fn();
      render(
        <BeneficiaryRail
          beneficiaries={SEEDED_BENEFICIARIES}
          onSelectBeneficiary={mockSelect}
        />
      );

      expect(screen.getByTestId('beneficiary-rail')).toBeInTheDocument();
      expect(screen.getByText('Quick Send to Beneficiary')).toBeInTheDocument();
      expect(screen.getByText('3 saved')).toBeInTheDocument();

      const btn = screen.getByLabelText('Send to Amina Bello, Guaranty Trust Bank (GTBank)');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(mockSelect).toHaveBeenCalledWith(SEEDED_BENEFICIARIES[0]);
    });

    it('auto-fills SendMoneyFlow Step 1 when a beneficiary is clicked', () => {
      render(
        <SendMoneyFlow
          initialState={mockBaseState}
          initialBeneficiaries={SEEDED_BENEFICIARIES}
        />
      );

      const aminaBtn = screen.getByLabelText('Send to Amina Bello, Guaranty Trust Bank (GTBank)');
      fireEvent.click(aminaBtn);

      // Verify account input and verified badge are populated immediately
      const accInput = screen.getByLabelText(/10-Digit NUBAN Account Number/i) as HTMLInputElement;
      expect(accInput.value).toBe('0000000010');
      expect(screen.getByTestId('account-verified-badge')).toBeInTheDocument();
      expect(within(screen.getByTestId('account-verified-badge')).getByText('Amina Bello')).toBeInTheDocument();

      // Verify Continue button is enabled
      const continueBtn = screen.getByRole('button', { name: /Continue to Amount/i });
      expect(continueBtn).not.toBeDisabled();
    });
  });

  describe('/api/wallet/beneficiaries Route Handlers (Cookie-Backed)', () => {
    beforeEach(() => {
      resetRateLimitStore();
    });

    it('rejects unauthenticated requests with 401', async () => {
      const getReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'GET',
      });
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(401);

      const postReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
        body: JSON.stringify({
          accountNumber: '0123456789',
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: 'Test',
        }),
      });
      const postRes = await POST(postReq);
      expect(postRes.status).toBe(401);

      const deleteReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries?id=ben_1', {
        method: 'DELETE',
      });
      const deleteRes = await DELETE(deleteReq);
      expect(deleteRes.status).toBe(401);
    });

    it('GET returns list of beneficiaries scoped to the authenticated user from cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        headers: { 'x-user-id': DEFAULT_USER_ID },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.beneficiaries)).toBe(true);
      expect(data.beneficiaries.length).toBeGreaterThanOrEqual(3);
    });

    it('POST validates 10-digit account number and required fields via Zod', async () => {
      const invalidAccReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_demo_user' },
        body: JSON.stringify({
          accountNumber: '123', // Invalid: not 10 digits
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: 'Test User',
        }),
      });

      const res1 = await POST(invalidAccReq);
      const data1 = await res1.json();
      expect(res1.status).toBe(400);
      expect(data1.success).toBe(false);
      expect(data1.error).toMatch(/10 digits/i);

      const emptyNameReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_demo_user' },
        body: JSON.stringify({
          accountNumber: '0123456789',
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: '', // Invalid: empty
        }),
      });

      const res2 = await POST(emptyNameReq);
      const data2 = await res2.json();
      expect(res2.status).toBe(400);
      expect(data2.success).toBe(false);
      expect(data2.error).toMatch(/Recipient name is required/i);
    });

    it('POST saves new beneficiary into kobo_state cookie and returns Set-Cookie header', async () => {
      const validReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
        headers: { 'x-user-id': DEFAULT_USER_ID },
        body: JSON.stringify({
          accountNumber: '9988776655',
          bankCode: '058',
          bankName: 'Guaranty Trust Bank (GTBank)',
          bankShortName: 'GTB',
          recipientName: 'Ngozi Okonjo',
        }),
      });

      const res = await POST(validReq);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.beneficiaries[0].recipientName).toBe('Ngozi Okonjo');

      // Verify Set-Cookie header is returned with kobo_state
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain(COOKIE_NAME);
    });

    it('enforces the maximum 5-beneficiary cap (Option A) and rejects the 6th addition', async () => {
      const testUserId = 'usr_cap_tester';
      let currentCookie = '';

      // Add up to MAX_BENEFICIARIES_CAP (5) beneficiaries by chaining session cookies
      // Start with clean initial state with 0 beneficiaries
      const cleanState: CompactSessionPayload = {
        bal: 24585050,
        pin: 0,
        loc: null,
        txs: [],
        ik: [],
        ben: [],
      };
      currentCookie = await sealSessionState(cleanState);

      for (let i = 1; i <= MAX_BENEFICIARIES_CAP; i++) {
        const paddedNum = i.toString().padStart(10, '0');
        const headers: Record<string, string> = {
          'x-user-id': testUserId,
          cookie: `${COOKIE_NAME}=${currentCookie}`,
        };
        const req = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            accountNumber: paddedNum,
            bankCode: '058',
            bankName: 'GTBank',
            recipientName: `Beneficiary ${i}`,
          }),
        });
        const res = await POST(req);
        expect(res.status).toBe(200);

        // Extract updated cookie from Set-Cookie header for next iteration
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) {
          const match = setCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
          if (match) {
            currentCookie = match[1];
          }
        }
      }

      // 6th beneficiary attempt must fail with 400
      const overflowReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
        headers: {
          'x-user-id': testUserId,
          cookie: `${COOKIE_NAME}=${currentCookie}`,
        },
        body: JSON.stringify({
          accountNumber: '9999999999',
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: 'Overflow Beneficiary',
        }),
      });

      const resOverflow = await POST(overflowReq);
      const dataOverflow = await resOverflow.json();
      expect(resOverflow.status).toBe(400);
      expect(dataOverflow.success).toBe(false);
      expect(dataOverflow.error).toMatch(/Maximum beneficiary cap of 5 reached/i);
    });

    it('prevents deleting another user\'s beneficiary and returns 403 Forbidden', async () => {
      // User Alice creates a beneficiary
      const userAReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
        headers: { 'x-user-id': 'user_alice' },
        body: JSON.stringify({
          accountNumber: '1111222233',
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: 'Alice Friend',
        }),
      });
      const userARes = await POST(userAReq);
      const userAData = await userARes.json();
      const aliceBenId = userAData.beneficiaries[0].id;
      expect(aliceBenId).toBeDefined();

      const setCookie = userARes.headers.get('set-cookie');
      let aliceCookie = '';
      if (setCookie) {
        const match = setCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
        if (match) {
          aliceCookie = match[1];
        }
      }

      // User Bob attempts to DELETE Alice's beneficiary using the cookie
      const attackReq = new NextRequest(
        `http://localhost:3000/api/wallet/beneficiaries?id=${aliceBenId}`,
        {
          method: 'DELETE',
          headers: {
            'x-user-id': 'user_bob',
            cookie: `${COOKIE_NAME}=${aliceCookie}`,
          },
        }
      );

      const attackRes = await DELETE(attackReq);
      const attackData = await attackRes.json();
      expect(attackRes.status).toBe(403);
      expect(attackData.success).toBe(false);
      expect(attackData.error).toMatch(/Forbidden: You cannot delete another user's beneficiary/i);

      // User Alice can successfully delete her own beneficiary
      const legitDeleteReq = new NextRequest(
        `http://localhost:3000/api/wallet/beneficiaries?id=${aliceBenId}`,
        {
          method: 'DELETE',
          headers: {
            'x-user-id': 'user_alice',
            cookie: `${COOKIE_NAME}=${aliceCookie}`,
          },
        }
      );
      const legitRes = await DELETE(legitDeleteReq);
      expect(legitRes.status).toBe(200);
      const legitData = await legitRes.json();
      expect(legitData.beneficiaries.some((b: Beneficiary) => b.id === aliceBenId)).toBe(false);
    });

    it('enforces rate limits on beneficiary endpoints', async () => {
      const rateLimitUser = 'usr_spammer';
      // Rate limit is 30 requests per minute
      for (let i = 0; i < 30; i++) {
        const req = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
          headers: { 'x-user-id': rateLimitUser },
        });
        const res = await GET(req);
        expect(res.status).toBe(200);
      }

      // 31st request should be rate-limited
      const throttledReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        headers: { 'x-user-id': rateLimitUser },
      });
      const throttledRes = await GET(throttledReq);
      expect(throttledRes.status).toBe(429);
      const throttledData = await throttledRes.json();
      expect(throttledData.error).toMatch(/Rate limit exceeded/i);
    });
  });
});

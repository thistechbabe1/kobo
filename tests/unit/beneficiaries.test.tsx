// @vitest-environment jsdom
/**
 * Unit and component tests for saved beneficiaries, storage in sealed cookies,
 * capacity caps, and selection within the SendMoneyFlow component.
 */
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
  BeneficiaryInputSchema,
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
        userId: DEFAULT_USER_ID,
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

      const restored = fromCompactBeneficiary(compact);
      expect(restored.accountNumber).toBe(original.accountNumber);
      expect(restored.recipientName).toBe(original.recipientName);
      expect(restored.bankName).toBe('Guaranty Trust Bank (GTBank)');
      expect(restored.bankShortName).toBe('GTB');
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

    it('caps recipientName at 40 characters in BeneficiaryInputSchema and rejects > 40 chars', () => {
      const validPayload = {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'A'.repeat(40), // Exactly 40 chars
      };
      const validResult = BeneficiaryInputSchema.safeParse(validPayload);
      expect(validResult.success).toBe(true);

      const invalidPayload = {
        ...validPayload,
        recipientName: 'A'.repeat(41), // 41 chars exceeds cap
      };
      const invalidResult = BeneficiaryInputSchema.safeParse(invalidPayload);
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.issues[0].message).toMatch(/Recipient name must not exceed 40 characters/i);
      }
    });

    it('truncates longer recipientName to 40 characters when saving a beneficiary', () => {
      const longName = 'Oluwaseun Babatunde-Oladipo-Williams-LongExtraCharacters';
      expect(longName.length).toBeGreaterThan(40);

      // In persistBeneficiary (new item)
      const savedNew = persistBeneficiary(
        {
          accountNumber: '1234567890',
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: longName,
        },
        []
      );
      expect(savedNew[0].recipientName).toBe(longName.slice(0, 40));
      expect(savedNew[0].recipientName.length).toBe(40);

      // In persistBeneficiary (update existing item)
      const updatedExisting = persistBeneficiary(
        {
          accountNumber: '1234567890',
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: longName + 'Updated',
        },
        savedNew
      );
      expect(updatedExisting[0].recipientName).toBe((longName + 'Updated').slice(0, 40));
      expect(updatedExisting[0].recipientName.length).toBe(40);

      // In toCompactBeneficiary
      const compact = toCompactBeneficiary({
        id: 'ben_trunc_test',
        userId: DEFAULT_USER_ID,
        accountNumber: '1234567890',
        bankCode: '058',
        bankName: 'GTBank',
        bankShortName: 'GTB',
        recipientName: longName,
        lastUsedAt: 1775736000000,
      });
      expect(compact.r).toBe(longName.slice(0, 40));
      expect(compact.r.length).toBe(40);
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

      const tooLongNameReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
        headers: { 'x-user-id': 'usr_demo_user' },
        body: JSON.stringify({
          accountNumber: '0123456789',
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: 'A'.repeat(41), // Exceeds 40 chars cap
        }),
      });

      const res3 = await POST(tooLongNameReq);
      const data3 = await res3.json();
      expect(res3.status).toBe(400);
      expect(data3.success).toBe(false);
      expect(data3.error).toMatch(/Recipient name must not exceed 40 characters/i);
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

    it('DELETE returns 404 if beneficiary is not found in the user session cookie', async () => {
      const nonExistentReq = new NextRequest(
        'http://localhost:3000/api/wallet/beneficiaries?id=ben_does_not_exist',
        {
          method: 'DELETE',
          headers: { 'x-user-id': DEFAULT_USER_ID },
        }
      );

      const res = await DELETE(nonExistentReq);
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Beneficiary not found/i);
    });

    it('deleting all beneficiaries leaves an empty list and does not bring seeded ones back', async () => {
      // 1. Fetch initial beneficiaries (3 seeded ones)
      const initialReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        headers: { 'x-user-id': DEFAULT_USER_ID },
      });
      const initialRes = await GET(initialReq);
      const initialData = await initialRes.json();
      expect(initialData.beneficiaries).toHaveLength(3);

      let currentCookie = '';

      // 2. Delete each beneficiary one by one, chaining session cookie
      for (const ben of initialData.beneficiaries) {
        const headers: Record<string, string> = { 'x-user-id': DEFAULT_USER_ID };
        if (currentCookie) {
          headers.cookie = `${COOKIE_NAME}=${currentCookie}`;
        }

        const delReq = new NextRequest(
          `http://localhost:3000/api/wallet/beneficiaries?id=${ben.id}`,
          {
            method: 'DELETE',
            headers,
          }
        );

        const delRes = await DELETE(delReq);
        expect(delRes.status).toBe(200);

        const setCookie = delRes.headers.get('set-cookie');
        if (setCookie) {
          const match = setCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
          if (match) {
            currentCookie = match[1];
          }
        }
      }

      // 3. Verify that the subsequent GET with this cookie returns an EMPTY array and NOT seeded ones
      const verifyReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        headers: {
          'x-user-id': DEFAULT_USER_ID,
          cookie: `${COOKIE_NAME}=${currentCookie}`,
        },
      });

      const verifyRes = await GET(verifyReq);
      const verifyData = await verifyRes.json();
      expect(verifyRes.status).toBe(200);
      expect(verifyData.success).toBe(true);
      expect(verifyData.beneficiaries).toHaveLength(0);
      expect(verifyData.beneficiaries).toEqual([]);
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

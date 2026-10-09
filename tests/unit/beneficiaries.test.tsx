// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  SEEDED_BENEFICIARIES,
  getSavedBeneficiaries,
  persistBeneficiary,
  removeBeneficiary,
  Beneficiary,
} from '@/lib/beneficiaries';
import { BeneficiaryRail } from '@/components/send/BeneficiaryRail';
import { SendMoneyFlow } from '@/components/send/SendMoneyFlow';
import { CompactSessionPayload } from '@/lib/session';
import { GET, POST, DELETE } from '@/app/api/wallet/beneficiaries/route';
import { NextRequest } from 'next/server';

const mockBaseState: CompactSessionPayload = {
  bal: 24585050,
  pin: 0,
  loc: null,
  txs: [],
  ik: [],
};

describe('Saved Beneficiaries (Feature 1)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('lib/beneficiaries CRUD and local persistence', () => {
    it('returns default seeded beneficiaries when storage is empty', () => {
      const list = getSavedBeneficiaries();
      expect(list).toHaveLength(3);
      expect(list[0].recipientName).toBe('Amina Bello');
      expect(list[1].recipientName).toBe('Folake Adeleke');
      expect(list[2].recipientName).toBe('Ibrahim Musa');
    });

    it('persists a new beneficiary and prepends to the list', () => {
      const updated = persistBeneficiary({
        accountNumber: '1122334455',
        bankCode: '058',
        bankName: 'Guaranty Trust Bank (GTBank)',
        bankShortName: 'GTB',
        recipientName: 'Chidi Mokeme',
      });

      expect(updated[0].recipientName).toBe('Chidi Mokeme');
      expect(updated[0].accountNumber).toBe('1122334455');
      expect(updated.length).toBe(4);

      // Verify loaded from storage
      const loaded = getSavedBeneficiaries();
      expect(loaded[0].recipientName).toBe('Chidi Mokeme');
    });

    it('updates existing beneficiary lastUsedAt when re-saved', () => {
      const updated = persistBeneficiary({
        accountNumber: '0000000010',
        bankCode: '058',
        bankName: 'Guaranty Trust Bank (GTBank)',
        bankShortName: 'GTB',
        recipientName: 'Amina Bello (Updated)',
      });

      expect(updated[0].accountNumber).toBe('0000000010');
      expect(updated[0].recipientName).toBe('Amina Bello (Updated)');
      expect(updated.length).toBe(3); // Deduplicated
    });

    it('removes a beneficiary by id', () => {
      const afterRemoval = removeBeneficiary('ben_1');
      expect(afterRemoval.some((b) => b.id === 'ben_1')).toBe(false);
      expect(afterRemoval).toHaveLength(2);
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

  describe('/api/wallet/beneficiaries Route Handlers', () => {
    it('GET returns list of beneficiaries', async () => {
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.beneficiaries)).toBe(true);
      expect(data.beneficiaries.length).toBeGreaterThanOrEqual(3);
    });

    it('POST validates 10-digit account number and required fields', async () => {
      const invalidReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
        body: JSON.stringify({
          accountNumber: '123', // Invalid
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: 'Test User',
        }),
      });

      const res = await POST(invalidReq);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/10 digits/i);
    });

    it('POST saves new beneficiary successfully', async () => {
      const validReq = new NextRequest('http://localhost:3000/api/wallet/beneficiaries', {
        method: 'POST',
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
    });

    it('DELETE removes beneficiary by ID', async () => {
      const deleteReq = new NextRequest(
        'http://localhost:3000/api/wallet/beneficiaries?id=ben_1',
        { method: 'DELETE' }
      );

      const res = await DELETE(deleteReq);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.beneficiaries.some((b: Beneficiary) => b.id === 'ben_1')).toBe(false);
    });
  });
});

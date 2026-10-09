import { NextRequest, NextResponse } from 'next/server';
import { SEEDED_BENEFICIARIES, Beneficiary } from '@/lib/beneficiaries';

// In-memory server store for demo session
let serverBeneficiaries: Beneficiary[] = [...SEEDED_BENEFICIARIES];

export async function GET() {
  return NextResponse.json({
    success: true,
    beneficiaries: serverBeneficiaries,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountNumber, bankCode, bankName, bankShortName, recipientName, nickname } = body;

    if (!accountNumber || !bankCode || !bankName || !recipientName) {
      return NextResponse.json(
        { success: false, error: 'Missing required beneficiary fields' },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { success: false, error: 'Account number must be exactly 10 digits' },
        { status: 400 }
      );
    }

    const existingIndex = serverBeneficiaries.findIndex(
      (b) => b.accountNumber === accountNumber && b.bankCode === bankCode
    );

    const now = Date.now();
    if (existingIndex >= 0) {
      serverBeneficiaries[existingIndex] = {
        ...serverBeneficiaries[existingIndex],
        recipientName,
        bankName,
        bankShortName: bankShortName || serverBeneficiaries[existingIndex].bankShortName,
        nickname: nickname || serverBeneficiaries[existingIndex].nickname,
        lastUsedAt: now,
      };
    } else {
      const newBeneficiary: Beneficiary = {
        id: `ben_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        accountNumber,
        bankCode,
        bankName,
        bankShortName: bankShortName || bankName.split(' ')[0],
        recipientName,
        nickname,
        lastUsedAt: now,
      };
      serverBeneficiaries.unshift(newBeneficiary);
    }

    return NextResponse.json({
      success: true,
      beneficiaries: serverBeneficiaries,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process beneficiary request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary ID is required' },
        { status: 400 }
      );
    }

    serverBeneficiaries = serverBeneficiaries.filter((b) => b.id !== id);

    return NextResponse.json({
      success: true,
      beneficiaries: serverBeneficiaries,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete beneficiary' },
      { status: 500 }
    );
  }
}

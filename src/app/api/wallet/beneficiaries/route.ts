import { NextRequest, NextResponse } from 'next/server';
import {
  Beneficiary,
  BeneficiaryInputSchema,
  MAX_BENEFICIARIES_CAP,
  DEFAULT_USER_ID,
} from '@/lib/beneficiaries';
import {
  getServerBeneficiaries,
  setServerBeneficiaries,
  checkRateLimit,
  getSessionUser,
} from '@/lib/beneficiaries-server';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Valid session required' },
      { status: 401 }
    );
  }

  // Rate limit by user ID
  if (!checkRateLimit(`GET:${user.userId}`)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  const serverBeneficiaries = getServerBeneficiaries();
  const userBeneficiaries = serverBeneficiaries.filter((b) => (b.userId || DEFAULT_USER_ID) === user.userId);

  return NextResponse.json({
    success: true,
    beneficiaries: userBeneficiaries,
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Valid session required' },
      { status: 401 }
    );
  }

  // Rate limit by user ID
  if (!checkRateLimit(`POST:${user.userId}`)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // 1. Zod Validation
    const validation = BeneficiaryInputSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstIssue?.message || 'Invalid beneficiary data',
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { accountNumber, bankCode, bankName, bankShortName, recipientName, nickname } = validation.data;

    // 2. User Scoping & Cap Check
    const serverBeneficiaries = getServerBeneficiaries();
    const userBeneficiaries = serverBeneficiaries.filter((b) => (b.userId || DEFAULT_USER_ID) === user.userId);
    const existingIndex = serverBeneficiaries.findIndex(
      (b) =>
        (b.userId || DEFAULT_USER_ID) === user.userId &&
        b.accountNumber === accountNumber &&
        b.bankCode === bankCode
    );

    const isUpdate = existingIndex >= 0;
    if (!isUpdate && userBeneficiaries.length >= MAX_BENEFICIARIES_CAP) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum beneficiary cap of ${MAX_BENEFICIARIES_CAP} reached. Please remove a beneficiary to add a new one.`,
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (isUpdate) {
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
        userId: user.userId,
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
    setServerBeneficiaries(serverBeneficiaries);

    const updatedUserBens = serverBeneficiaries.filter((b) => (b.userId || DEFAULT_USER_ID) === user.userId);

    return NextResponse.json({
      success: true,
      beneficiaries: updatedUserBens,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process beneficiary request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Valid session required' },
      { status: 401 }
    );
  }

  // Rate limit by user ID
  if (!checkRateLimit(`DELETE:${user.userId}`)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary ID is required' },
        { status: 400 }
      );
    }

    const serverBeneficiaries = getServerBeneficiaries();
    const targetIndex = serverBeneficiaries.findIndex((b) => b.id === id);
    if (targetIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    const target = serverBeneficiaries[targetIndex];
    // Security check: Cannot delete another user's beneficiary!
    if ((target.userId || DEFAULT_USER_ID) !== user.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot delete another user's beneficiary" },
        { status: 403 }
      );
    }

    serverBeneficiaries.splice(targetIndex, 1);
    setServerBeneficiaries(serverBeneficiaries);

    const updatedUserBens = serverBeneficiaries.filter((b) => (b.userId || DEFAULT_USER_ID) === user.userId);

    return NextResponse.json({
      success: true,
      beneficiaries: updatedUserBens,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete beneficiary' },
      { status: 500 }
    );
  }
}

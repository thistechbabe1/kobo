import { NextRequest, NextResponse } from 'next/server';
import {
  BeneficiaryInputSchema,
  MAX_BENEFICIARIES_CAP,
  DEFAULT_USER_ID,
  getSavedBeneficiaries,
  SEEDED_COMPACT_BENEFICIARIES,
} from '@/lib/beneficiaries';
import {
  COOKIE_NAME,
  CompactBeneficiary,
  CompactSessionPayload,
  sealSessionState,
  unsealSessionState,
} from '@/lib/session';
import {
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

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const state = await unsealSessionState(cookie);
  const userBeneficiaries = getSavedBeneficiaries(state, user.userId);

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

    // 2. Cookie State Unseal
    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    const state = await unsealSessionState(cookie);
    const currentBens: CompactBeneficiary[] = state.ben && state.ben.length > 0
      ? [...state.ben]
      : [...SEEDED_COMPACT_BENEFICIARIES];

    const userBens = currentBens.filter((b) => (b.u || DEFAULT_USER_ID) === user.userId);
    const existingIndex = currentBens.findIndex(
      (b) =>
        (b.u || DEFAULT_USER_ID) === user.userId &&
        b.a === accountNumber &&
        b.b === bankCode
    );

    const isUpdate = existingIndex >= 0;
    if (!isUpdate && userBens.length >= MAX_BENEFICIARIES_CAP) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum beneficiary cap of ${MAX_BENEFICIARIES_CAP} reached. Please remove a beneficiary to add a new one.`,
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    let updatedBens: CompactBeneficiary[];

    if (isUpdate) {
      const existing = currentBens[existingIndex];
      const updatedItem: CompactBeneficiary = {
        ...existing,
        n: bankName,
        s: bankShortName || existing.s,
        r: recipientName,
        k: nickname || existing.k,
        t: now,
      };
      updatedBens = [
        updatedItem,
        ...currentBens.filter((_, idx) => idx !== existingIndex),
      ];
    } else {
      const newBeneficiary: CompactBeneficiary = {
        id: `ben_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        u: user.userId !== DEFAULT_USER_ID ? user.userId : undefined,
        a: accountNumber,
        b: bankCode,
        n: bankName,
        s: bankShortName || bankName.split(' ')[0],
        r: recipientName,
        k: nickname,
        t: now,
      };
      updatedBens = [newBeneficiary, ...currentBens].slice(0, MAX_BENEFICIARIES_CAP);
    }

    const updatedState: CompactSessionPayload = {
      ...state,
      ben: updatedBens,
    };

    const sealedToken = await sealSessionState(updatedState);
    const response = NextResponse.json({
      success: true,
      beneficiaries: getSavedBeneficiaries(updatedState, user.userId),
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: sealedToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    });

    return response;
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

    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    const state = await unsealSessionState(cookie);
    const currentBens: CompactBeneficiary[] = state.ben && state.ben.length > 0
      ? [...state.ben]
      : [...SEEDED_COMPACT_BENEFICIARIES];

    const targetIndex = currentBens.findIndex((b) => b.id === id);
    if (targetIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    const target = currentBens[targetIndex];
    // Security check: Cannot delete another user's beneficiary!
    if ((target.u || DEFAULT_USER_ID) !== user.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot delete another user's beneficiary" },
        { status: 403 }
      );
    }

    const updatedBens = currentBens.filter((b) => b.id !== id);
    const updatedState: CompactSessionPayload = {
      ...state,
      ben: updatedBens,
    };

    const sealedToken = await sealSessionState(updatedState);
    const response = NextResponse.json({
      success: true,
      beneficiaries: getSavedBeneficiaries(updatedState, user.userId),
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: sealedToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete beneficiary' },
      { status: 500 }
    );
  }
}

/**
 * Beneficiary management endpoint for listing, saving, and removing payees.
 * State is stored client-side in the sealed JWE session cookie capped to respect RFC limits.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  BeneficiaryInputSchema,
  MAX_BENEFICIARIES_CAP,
  getSavedBeneficiaries,
  SEEDED_COMPACT_BENEFICIARIES,
} from '@/lib/beneficiaries';
import { DeleteBeneficiaryQuerySchema } from '@/lib/validations';
import {
  COOKIE_NAME,
  CompactBeneficiary,
  CompactSessionPayload,
  sealSessionState,
  unsealSessionState,
} from '@/lib/session';
import {
  checkRateLimitDetailed,
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
  const getRateLimit = checkRateLimitDetailed(`GET:${user.userId}`);
  if (!getRateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: getRateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(getRateLimit.retryAfterSeconds),
        },
      }
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
  const postRateLimit = checkRateLimitDetailed(`POST:${user.userId}`);
  if (!postRateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: postRateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(postRateLimit.retryAfterSeconds),
        },
      }
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
    // If state.ben is an array (even if empty []), respect it; otherwise fall back to initial seeds
    const currentBens: CompactBeneficiary[] = Array.isArray(state.ben)
      ? [...state.ben]
      : [...SEEDED_COMPACT_BENEFICIARIES];

    const existingIndex = currentBens.findIndex(
      (b) => b.a === accountNumber && b.b === bankCode
    );

    const isUpdate = existingIndex >= 0;
    if (!isUpdate && currentBens.length >= MAX_BENEFICIARIES_CAP) {
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
        n: bankShortName || bankName.slice(0, 20),
        r: recipientName.slice(0, 40),
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
        a: accountNumber,
        b: bankCode,
        n: bankShortName || bankName.slice(0, 20),
        r: recipientName.slice(0, 40),
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
  const deleteRateLimit = checkRateLimitDetailed(`DELETE:${user.userId}`);
  if (!deleteRateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: deleteRateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(deleteRateLimit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryParsed = DeleteBeneficiaryQuerySchema.safeParse({
      id: searchParams.get('id'),
    });

    if (!queryParsed.success) {
      const errorMsg = queryParsed.error.issues[0]?.message || 'Beneficiary ID is required';
      return NextResponse.json(
        { success: false, error: errorMsg, issues: queryParsed.error.issues },
        { status: 400 }
      );
    }

    const { id } = queryParsed.data;

    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    const state = await unsealSessionState(cookie);
    // If state.ben is an array (even if empty []), respect it; otherwise fall back to initial seeds
    const currentBens: CompactBeneficiary[] = Array.isArray(state.ben)
      ? [...state.ben]
      : [...SEEDED_COMPACT_BENEFICIARIES];

    const targetIndex = currentBens.findIndex((b) => b.id === id);
    if (targetIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
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

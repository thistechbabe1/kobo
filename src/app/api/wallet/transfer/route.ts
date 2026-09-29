import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  COOKIE_NAME,
  processTransferDebit,
  sealSessionState,
  unsealAuthToken,
  unsealSessionState,
} from '@/lib/session';

// In-memory set for locking concurrent in-flight requests with identical idempotency keys
const inFlightKeys = new Set<string>();

export async function POST(request: NextRequest) {
  let activeIdempotencyKey: string | null = null;

  try {
    // 1. Auth Guard
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const authSession = await unsealAuthToken(authCookie);
    if (!authSession) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to make transfers.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Parse and Validate Request Payload
    const body = await request.json();
    const {
      accountNumber,
      bankCode,
      bankName,
      recipientName,
      amount,
      amountKobo: rawAmountKobo,
      narration,
      pin,
      idempotencyKey,
    } = body;

    const transferAmountKobo = typeof rawAmountKobo === 'number' ? rawAmountKobo : typeof amount === 'number' ? amount : 0;

    if (!accountNumber || !/^\d{10}$/.test(String(accountNumber).trim())) {
      return NextResponse.json(
        { error: 'Valid 10-digit account number is required', code: 'INVALID_ACCOUNT' },
        { status: 400 }
      );
    }

    if (!bankCode || typeof bankCode !== 'string') {
      return NextResponse.json(
        { error: 'Bank selection is required', code: 'INVALID_BANK' },
        { status: 400 }
      );
    }

    if (!recipientName || typeof recipientName !== 'string') {
      return NextResponse.json(
        { error: 'Recipient name is required', code: 'INVALID_RECIPIENT' },
        { status: 400 }
      );
    }

    if (!transferAmountKobo || transferAmountKobo <= 0 || !Number.isInteger(transferAmountKobo)) {
      return NextResponse.json(
        { error: 'Transfer amount must be a positive integer in Kobo', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 4 digits', code: 'INVALID_PIN_FORMAT' },
        { status: 400 }
      );
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return NextResponse.json(
        { error: 'Idempotency-Key is required to prevent duplicate transfers', code: 'MISSING_IDEMPOTENCY_KEY' },
        { status: 400 }
      );
    }

    // Concurrency Lock on the specific Idempotency Key
    if (inFlightKeys.has(idempotencyKey)) {
      return NextResponse.json(
        {
          error: 'A transfer with this idempotency key is currently processing. Please wait.',
          code: 'CONCURRENT_REQUEST',
        },
        { status: 409 }
      );
    }

    activeIdempotencyKey = idempotencyKey;
    inFlightKeys.add(idempotencyKey);

    // 3. Deterministic Simulation Triggers
    const cleanAccount = String(accountNumber).trim();

    // Trigger: 0000000001 -> NIP Network Timeout (504 Gateway Timeout)
    if (cleanAccount === '0000000001') {
      return NextResponse.json(
        {
          error: 'NIP Network timeout communicating with destination bank. You can retry safely.',
          code: 'NETWORK_TIMEOUT',
          retryable: true,
        },
        { status: 504 }
      );
    }

    // Trigger: 0000000002 -> Destination Bank Offline (502 Bad Gateway)
    if (cleanAccount === '0000000002') {
      return NextResponse.json(
        {
          error: 'Destination bank is currently offline or unreachable. Please try again later.',
          code: 'BANK_OFFLINE',
          retryable: false,
        },
        { status: 502 }
      );
    }

    // 4. Unseal Current Session State
    const stateCookie = request.cookies.get(COOKIE_NAME)?.value;
    const currentState = await unsealSessionState(stateCookie);

    // 5. Execute Core Debit Logic with Server-Side Idempotency and Zero-Log PIN
    const result = processTransferDebit(currentState, {
      accountNumber: cleanAccount,
      bankCode,
      bankName: bankName || 'Bank',
      recipientName,
      amountKobo: transferAmountKobo,
      narration: typeof narration === 'string' ? narration : undefined,
      pin,
      idempotencyKey,
    });

    if (result.status === 'LOCKED') {
      return NextResponse.json(
        {
          error: 'Account temporarily locked due to repeated incorrect PIN entries.',
          code: 'ACCOUNT_LOCKED',
          retryAfterMs: result.retryAfterMs,
          lockUntil: result.lockUntilMs,
        },
        { status: 423 }
      );
    }

    if (result.status === 'PIN_LOCKED') {
      const sealed = await sealSessionState(result.updatedState);
      const res = NextResponse.json(
        {
          error: 'Account locked for 15 minutes due to 3 consecutive failed PIN attempts.',
          code: 'ACCOUNT_LOCKED',
          lockUntil: result.lockUntilMs,
        },
        { status: 423 }
      );
      res.cookies.set({
        name: COOKIE_NAME,
        value: sealed,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800,
      });
      return res;
    }

    if (result.status === 'INVALID_PIN') {
      const sealed = await sealSessionState(result.updatedState);
      const res = NextResponse.json(
        {
          error: 'Incorrect transaction PIN.',
          code: 'INVALID_PIN',
          attemptsRemaining: result.attemptsRemaining,
        },
        { status: 401 }
      );
      res.cookies.set({
        name: COOKIE_NAME,
        value: sealed,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800,
      });
      return res;
    }

    if (result.status === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json(
        {
          error: 'Insufficient wallet balance for this transfer including fee.',
          code: 'INSUFFICIENT_FUNDS',
          balance: result.balanceKobo,
          required: result.requiredKobo,
        },
        { status: 422 }
      );
    }

    if (result.status === 'IDEMPOTENT_DUPLICATE') {
      return NextResponse.json({
        success: true,
        idempotentReplay: true,
        transaction: result.tx,
        fee: result.feeKobo,
        totalDebit: result.totalDebitKobo,
        newBalance: result.updatedState.bal,
      });
    }

    // Success! Seal state and return
    const sealedToken = await sealSessionState(result.updatedState);
    const response = NextResponse.json({
      success: true,
      transaction: result.tx,
      fee: result.feeKobo,
      totalDebit: result.totalDebitKobo,
      newBalance: result.updatedState.bal,
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
      { error: 'An unexpected error occurred during transfer processing.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  } finally {
    if (activeIdempotencyKey) {
      inFlightKeys.delete(activeIdempotencyKey);
    }
  }
}

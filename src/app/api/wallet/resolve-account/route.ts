import { NextResponse } from 'next/server';
import { ResolveAccountInputSchema } from '@/lib/validations';
import { checkRateLimitDetailed, getClientIp } from '@/lib/rate-limit';

const FIRST_NAMES = [
  'Chukwudi', 'Olumide', 'Zainab', 'Fatima', 'Ngozi',
  'Ibrahim', 'Tunde', 'Aisha', 'Blessing', 'Damilola',
];

const LAST_NAMES = [
  'Okafor', 'Balogun', 'Adeyemi', 'Danjuma', 'Eze',
  'Suleiman', 'Nwosu', 'Abubakar', 'Lawal', 'Oladipo',
];

function resolveMockName(accountNumber: string): string {
  if (accountNumber === '0123456789') return 'Chioma Adebayo';
  if (accountNumber === '0000000001') return 'Emeka Okonkwo';
  if (accountNumber === '0000000002') return 'Amina Bello';

  const fnIndex = parseInt(accountNumber[8] || '0', 10) % FIRST_NAMES.length;
  const lnIndex = parseInt(accountNumber[9] || '0', 10) % LAST_NAMES.length;
  return `${FIRST_NAMES[fnIndex]} ${LAST_NAMES[lnIndex]}`;
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  if (process.env.NODE_ENV === 'production' && clientIp === 'unknown') {
    return NextResponse.json(
      {
        error: 'Unable to determine client IP address from trusted headers. Request rejected.',
        code: 'IP_REQUIRED',
      },
      { status: 429 }
    );
  }

  const limitMax = clientIp === 'unknown' ? 100 : 30;
  const rateLimit = checkRateLimitDetailed(`resolve:${clientIp}`, limitMax, 60000);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Too many account lookup requests. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = ResolveAccountInputSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid account details';
      return NextResponse.json(
        { error: errorMsg, code: 'INVALID_INPUT', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { accountNumber, bankCode } = parsed.data;
    const cleanAccount = accountNumber.trim();

    // Deterministic simulation trigger: 0000000003 is unregistered / not found
    if (cleanAccount === '0000000003') {
      return NextResponse.json(
        {
          error: 'Account not found. Please verify the account number and selected bank.',
          code: 'ACCOUNT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const accountName = resolveMockName(cleanAccount);

    return NextResponse.json({
      success: true,
      accountNumber: cleanAccount,
      bankCode,
      accountName,
    });
  } catch {
    return NextResponse.json(
      { error: 'Account resolution service error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

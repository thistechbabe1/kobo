import { NextResponse } from 'next/server';

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
  try {
    const body = await request.json();
    const { accountNumber, bankCode } = body;

    if (!accountNumber || typeof accountNumber !== 'string') {
      return NextResponse.json(
        { error: 'Account number is required', code: 'INVALID_ACCOUNT' },
        { status: 400 }
      );
    }

    const cleanAccount = accountNumber.trim();

    if (!/^\d{10}$/.test(cleanAccount)) {
      return NextResponse.json(
        { error: 'Account number must be exactly 10 digits', code: 'INVALID_ACCOUNT_FORMAT' },
        { status: 400 }
      );
    }

    if (!bankCode) {
      return NextResponse.json(
        { error: 'Bank selection is required', code: 'INVALID_BANK' },
        { status: 400 }
      );
    }

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

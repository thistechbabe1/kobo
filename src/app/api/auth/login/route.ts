import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, sealAuthToken } from '@/lib/session';
import { LoginInputSchema } from '@/lib/validations';
import { checkRateLimitDetailed, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // 1. Dual Rate Limiting: IP-level + (IP + lowercased email)
  const clientIp = getClientIp(request);

  // 1a. IP-level rate limit: max 10 attempts per minute per IP
  const ipRateLimit = checkRateLimitDetailed(`login:${clientIp}`, 10, 60000);
  if (!ipRateLimit.success) {
    return NextResponse.json(
      {
        error: 'Too many login attempts from this network. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: ipRateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(ipRateLimit.retryAfterSeconds),
        },
      }
    );
  }

  // 2. Wrap body parse in try/catch for key extraction and validation
  let rawBody: unknown = null;
  let isJsonParseError = false;
  try {
    const text = await request.clone().text();
    if (text) {
      try {
        rawBody = JSON.parse(text);
      } catch {
        isJsonParseError = true;
      }
    }
  } catch {
    // If request clone fails
  }

  const typedBody = (typeof rawBody === 'object' && rawBody !== null ? rawBody : null) as { email?: unknown } | null;
  const rawEmail = typeof typedBody?.email === 'string' ? typedBody.email : '';
  const normalizedEmail = rawEmail ? rawEmail.trim().toLowerCase() : 'unknown';
  const emailRateLimitKey = `login:${clientIp}:${normalizedEmail}`;

  // 1b. IP + lowercased email rate limit: max 10 attempts per minute. Both IP and IP+email limits must pass!
  const emailRateLimit = checkRateLimitDetailed(emailRateLimitKey, 10, 60000);
  if (!emailRateLimit.success) {
    return NextResponse.json(
      {
        error: 'Too many login attempts for this account. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: emailRateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(emailRateLimit.retryAfterSeconds),
        },
      }
    );
  }

  // Malformed JSON must reach validation and return 400 with code INVALID_INPUT, never 500
  if (isJsonParseError) {
    return NextResponse.json(
      { error: 'Invalid JSON payload in request body', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  try {
    const parsed = LoginInputSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid login request';
      return NextResponse.json(
        { error: errorMsg, code: 'INVALID_INPUT', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Server-side credential check
    const isDemoQuickLogin = email === 'babatunde@kobo.demo';
    const isValidPassword = password === 'demopassword123' || password === '••••••••••••' || isDemoQuickLogin;

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email address or password', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Seal user claims into JWE token using jose
    const token = await sealAuthToken({
      sub: 'usr_babatunde_001',
      email: 'babatunde@kobo.demo',
      name: 'Babatunde Adebayo',
    });

    const response = NextResponse.json({ success: true, redirect: '/dashboard' });

    // Set secure HTTP-only cookie with matching 7-day maxAge
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 604800, // 7 days (matching token expiry)
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Server authentication error', code: 'SERVER_ERROR' }, { status: 500 });
  }
}

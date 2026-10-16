/**
 * Login route that authenticates demo credentials and sets the sealed JWE auth cookie.
 * Enforces multi-tier in-memory per-instance rate limits and rejects unknown IPs in production.
 */
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, sealAuthToken } from '@/lib/session';
import { LoginInputSchema } from '@/lib/validations';
import { checkRateLimitDetailed, peekRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  // On Vercel edge/serverless ingress, reject request when no trusted IP header exists
  if (process.env.VERCEL && clientIp === 'unknown') {
    return NextResponse.json(
      {
        error: 'Unable to determine client IP address from trusted headers. Request rejected.',
        code: 'IP_REQUIRED',
      },
      { status: 429 }
    );
  }

  // 1. Safe body parse in try/catch for rate limit keying and validation
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
  const normalizedEmail = rawEmail ? rawEmail.trim().toLowerCase() : '';

  // Limit 1: IP-level rate limit: 40/min (generous 100/min when IP is unknown in local dev)
  const ipLimitMax = clientIp === 'unknown' ? 100 : 40;
  const ipRateLimit = checkRateLimitDetailed(`login:ip:${clientIp}`, ipLimitMax, 60000);
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

  // Limit 2: Email-only failed login limit across all IPs: 15 failed logins/min
  // We inspect peekRateLimit first so successful logins are never locked out prematurely.
  if (normalizedEmail) {
    const failedEmailLimit = peekRateLimit(`login:failed_email:${normalizedEmail}`, 15);
    if (!failedEmailLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many failed login attempts for this account across networks. Please wait before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: failedEmailLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(failedEmailLimit.retryAfterSeconds),
          },
        }
      );
    }

    // Limit 3: IP + lowercased email limit: 8/min (counts all attempts from this specific IP)
    const ipEmailRateLimit = checkRateLimitDetailed(`login:ip_email:${clientIp}:${normalizedEmail}`, 8, 60000);
    if (!ipEmailRateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many login attempts for this account from this network. Please wait before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: ipEmailRateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipEmailRateLimit.retryAfterSeconds),
          },
        }
      );
    }
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
      // Record failed attempt against the email-only cross-network failure limiter
      if (normalizedEmail) {
        checkRateLimitDetailed(`login:failed_email:${normalizedEmail}`, 15, 60000);
      }

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

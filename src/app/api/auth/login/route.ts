import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, sealAuthToken } from '@/lib/session';
import { LoginInputSchema } from '@/lib/validations';
import { checkRateLimitDetailed, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  let body: { email?: string; password?: string } | null = null;
  try {
    body = await request.clone().json();
  } catch {
    // If body cannot be cloned/parsed, rate limit by IP alone
  }

  const clientIp = getClientIp(request);
  const normalizedEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : 'unknown';
  const rateLimitKey = `login:${clientIp}:${normalizedEmail}`;

  // Rate limit: max 10 login attempts per minute per IP + email
  const rateLimit = checkRateLimitDetailed(rateLimitKey, 10, 60000);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Too many login attempts. Please wait before trying again.',
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
    const rawBody = body ?? (await request.json().catch(() => null));
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

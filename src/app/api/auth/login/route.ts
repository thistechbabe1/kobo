import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, sealAuthToken } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

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

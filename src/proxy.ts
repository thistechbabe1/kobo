import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, unsealAuthToken } from '@/lib/session';

export { AUTH_COOKIE_NAME };

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public routes that are always accessible
  const publicRoutes = ['/', '/login', '/api/auth/login'];
  if (publicRoutes.includes(pathname)) {
    // If visiting /login while already authenticated, redirect to /dashboard
    if (pathname === '/login') {
      const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
      const session = await unsealAuthToken(authCookie?.value);
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Protected API routes (/api/*): return JSON 401 if unauthenticated
  if (pathname.startsWith('/api/')) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
    const session = await unsealAuthToken(authCookie?.value);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 3. Protected Page routes (/dashboard, /transactions, /send): redirect to /login
  const protectedPages = ['/dashboard', '/transactions', '/send'];
  const isProtectedPage = protectedPages.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedPage) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
    const session = await unsealAuthToken(authCookie?.value);

    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

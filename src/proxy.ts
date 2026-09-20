import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'kobo_auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes requiring authentication
  const protectedRoutes = ['/dashboard', '/transactions', '/send'];

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
    const isAuthenticated = Boolean(authCookie?.value);

    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If visiting /login while already logged in, redirect to /dashboard
  if (pathname === '/login') {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
    if (authCookie?.value) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// Fallback export for middleware compatibility
export const middleware = proxy;

export const config = {
  matcher: ['/dashboard/:path*', '/transactions/:path*', '/send/:path*', '/login'],
};

import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, COOKIE_NAME } from '@/lib/session';

function clearAuthCookies() {
  const response = NextResponse.json({ success: true, redirect: '/login' });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}

export async function POST() {
  return clearAuthCookies();
}

export async function GET() {
  return clearAuthCookies();
}

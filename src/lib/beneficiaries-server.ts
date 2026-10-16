/**
 * Server-side helpers for beneficiary operations, resolving authenticated users
 * from sealed JWE session cookies with test header fallback.
 */
import { NextRequest } from 'next/server';
import { unsealAuthToken, AUTH_COOKIE_NAME } from '@/lib/session';

import {
  checkRateLimitDetailed,
  checkRateLimit,
  resetRateLimitStore,
  getClientIp,
} from '@/lib/rate-limit';

export { checkRateLimitDetailed, checkRateLimit, resetRateLimitStore, getClientIp };

/**
 * Extracts and verifies the authenticated user from the request session cookie or headers.
 */
export async function getSessionUser(request: NextRequest): Promise<{ userId: string } | null> {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie) {
    const session = await unsealAuthToken(cookie);
    if (session && session.sub) {
      return { userId: session.sub };
    }
  }

  // Header fallback for testing and programmatic clients
  const headerUser = request.headers.get('x-user-id');
  if (headerUser) {
    return { userId: headerUser };
  }

  return null;
}

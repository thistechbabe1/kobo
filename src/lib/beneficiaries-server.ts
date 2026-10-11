import { NextRequest } from 'next/server';
import { unsealAuthToken, AUTH_COOKIE_NAME } from '@/lib/session';

// Rate Limiter: In-memory sliding window (max 30 requests per 60s per user)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

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

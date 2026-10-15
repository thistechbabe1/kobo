import { NextRequest } from 'next/server';

/**
 * Rate Limiter Record for fixed-window tracking.
 *
 * NOTE ON ARCHITECTURE & PER-INSTANCE LIMITATION:
 * This rate limiter uses a local in-memory Map store. In multi-instance or
 * serverless edge deployments, each compute instance maintains its own memory,
 * meaning requests routed across different instances will not share bucket state.
 * For a distributed production deployment, back this store with an external
 * Redis instance (e.g. Upstash Redis / ioredis). For single-instance, local dev,
 * and standard evaluation, this lightweight in-memory store provides strict
 * enforcement with zero external infrastructure overhead.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Evicts expired entries from the in-memory store to prevent memory leaks.
 * Can be called explicitly or automatically during rate limit checks.
 *
 * @param now Epoch timestamp in milliseconds (defaults to Date.now())
 * @returns Number of expired entries evicted
 */
export function evictExpiredEntries(now: number = Date.now()): number {
  let evictedCount = 0;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetAt) {
      rateLimitStore.delete(key);
      evictedCount++;
    }
  }
  return evictedCount;
}

/**
 * Returns current count of active entries in the in-memory store (for testing/diagnostics).
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Checks rate limit for a given identifier key.
 *
 * @param key Unique key to rate limit (e.g. `login:ip:127.0.0.1` or `transfer:usr_123`)
 * @param limit Maximum allowed requests per window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimitDetailed(
  key: string,
  limit = 30,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();

  // Opportunistic garbage collection of expired entries when the store grows
  if (rateLimitStore.size > 20) {
    evictExpiredEntries(now);
  }

  const record = rateLimitStore.get(key);

  if (!record || now >= record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  return {
    success: true,
    limit,
    remaining,
    retryAfterSeconds: 0,
  };
}

/**
 * Backward-compatible boolean helper.
 */
export function checkRateLimit(key: string, limit = 30, windowMs = 60000): boolean {
  return checkRateLimitDetailed(key, limit, windowMs).success;
}

/**
 * Resets the rate limiter store (primarily for test isolation).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Extracts the trusted client IP from request headers.
 *
 * Priority order:
 *   1. Vercel's trusted `x-real-ip` header (set by edge ingress, cannot be spoofed).
 *   2. The LAST entry in `x-forwarded-for` (appended by the closest trusted proxy),
 *      preventing spoofing from client-injected leading IPs.
 *   3. Shared fallback: 'unknown' (with a generous limit in non-production, or rejected
 *      with 429 in production environments where trusted IP headers are required).
 */
export function getClientIp(request: Request | NextRequest): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return 'unknown';
}

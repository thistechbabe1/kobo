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
 * Checks rate limit for a given identifier key.
 *
 * @param key Unique key to rate limit (e.g. `login:127.0.0.1` or `transfer:usr_123`)
 * @param limit Maximum allowed requests per window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimitDetailed(
  key: string,
  limit = 30,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
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
 * Extracts a best-effort client IP from headers.
 */
export function getClientIp(request: Request | NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

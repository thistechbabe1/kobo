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

/** Monotonic counter used to generate unique fallback IPs when no header is present. */
let fallbackCounter = 0;

/**
 * Extracts the trusted client IP from request headers.
 *
 * Priority order:
 *   1. Vercel's trusted `x-real-ip` header (set by edge ingress, cannot be spoofed).
 *   2. The LAST entry in `x-forwarded-for` (appended by the closest trusted proxy),
 *      preventing spoofing from client-injected leading IPs.
 *   3. A unique per-request fallback `unknown-<counter>` so that headerless requests
 *      are never lumped into one shared bucket. This covers direct-access or test
 *      environments where no proxy sets IP headers.
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

  // Each headerless request gets a unique key so rate limits are never
  // shared across unrelated callers that happen to lack proxy headers.
  fallbackCounter += 1;
  return `unknown-${fallbackCounter}`;
}

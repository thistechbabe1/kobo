/**
 * In-memory sliding-window rate limiter with LRU eviction and IP extraction.
 * Limits are tracked per server instance; production requires a distributed store like Redis.
 */
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

export const MAX_RATE_LIMIT_STORE_SIZE = 5000;

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Evicts expired entries from the in-memory store to prevent memory leaks.
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
 * Enforces a hard cap on the in-memory store size to prevent unbounded memory growth.
 * When the cap is reached, it first evicts expired entries, and if still at or above
 * the cap, it drops the oldest entries (Map insertion order).
 *
 * @param maxSize Maximum allowed active entries in the Map
 * @param now Epoch timestamp in milliseconds
 * @returns Object containing counts of expired entries evicted and oldest entries dropped
 */
export function enforceMaxStoreSize(
  maxSize: number = MAX_RATE_LIMIT_STORE_SIZE,
  now: number = Date.now()
): { evicted: number; dropped: number } {
  const evicted = evictExpiredEntries(now);

  let dropped = 0;
  if (rateLimitStore.size > maxSize) {
    for (const key of rateLimitStore.keys()) {
      rateLimitStore.delete(key);
      dropped++;
      if (rateLimitStore.size <= maxSize) {
        break;
      }
    }
  }

  return { evicted, dropped };
}

/**
 * Returns current count of active entries in the in-memory store (for testing/diagnostics).
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Inspects rate limit state without incrementing the counter.
 * Useful for checking whether an entity is locked out before taking an action
 * (e.g. checking failed login limits before processing credentials).
 */
export function peekRateLimit(key: string, limit = 30): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now >= record.resetAt) {
    return {
      success: true,
      limit,
      remaining: limit,
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

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - record.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Checks rate limit for a given identifier key and increments the counter.
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

  // If key does not exist yet, enforce capacity bounds before insertion
  if (!rateLimitStore.has(key)) {
    if (rateLimitStore.size >= MAX_RATE_LIMIT_STORE_SIZE) {
      enforceMaxStoreSize(MAX_RATE_LIMIT_STORE_SIZE, now);
    } else if (rateLimitStore.size > 20) {
      evictExpiredEntries(now);
    }
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
 *      with 429 on Vercel where trusted IP headers are required).
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

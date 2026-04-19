// In-process token-bucket rate limiter. Soft defense — good enough for MVP
// scale (single Vercel instance, or a handful at most). Resets on restart.
// For real scale, swap the Map for Upstash Redis with the same key shape.
//
// Not a security hard-wall; a CAPTCHA-free way to stop dumb script abuse
// without asking real users to do anything.

import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodic cleanup — keep the Map from growing unbounded.
// Runs every 5 minutes; prunes expired entries.
let lastGc = 0;
const GC_INTERVAL_MS = 5 * 60 * 1000;

function maybeGc(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/**
 * @param key   identity + action bucket, e.g. `waitlist:${ip}`
 * @param limit max attempts per window
 * @param windowMs rolling window size
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  maybeGc(now);

  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** Best-effort client IP from request headers. Returns "unknown" if nothing usable. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    // First entry is the original client in most proxies (Vercel uses this).
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

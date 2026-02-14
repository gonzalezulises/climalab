/**
 * In-memory sliding-window rate limiter.
 * No external dependencies (no Redis).
 */

const store = new Map<string, number[]>();

// Periodic cleanup of expired entries (every 60s)
let cleanupScheduled = false;

function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store) {
      const filtered = timestamps.filter((t) => now - t < 120_000);
      if (filtered.length === 0) {
        store.delete(key);
      } else {
        store.set(key, filtered);
      }
    }
  }, 60_000).unref?.();
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { success: boolean; remaining: number } {
  scheduleCleanup();

  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= opts.limit) {
    store.set(key, timestamps);
    return { success: false, remaining: 0 };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { success: true, remaining: opts.limit - timestamps.length };
}

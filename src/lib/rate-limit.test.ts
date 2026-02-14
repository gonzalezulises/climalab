import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "./rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

describe("rateLimit", () => {
  it("allows first request", () => {
    const result = rateLimit("test:1", { limit: 3, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks after exceeding limit", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("test:2", { limit: 3, windowMs: 60_000 });
    }
    const result = rateLimit("test:2", { limit: 3, windowMs: 60_000 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expiry", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("test:3", { limit: 3, windowMs: 60_000 });
    }
    // Advance time past the window
    vi.advanceTimersByTime(61_000);
    const result = rateLimit("test:3", { limit: 3, windowMs: 60_000 });
    expect(result.success).toBe(true);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("key:a", { limit: 3, windowMs: 60_000 });
    }
    const resultA = rateLimit("key:a", { limit: 3, windowMs: 60_000 });
    const resultB = rateLimit("key:b", { limit: 3, windowMs: 60_000 });
    expect(resultA.success).toBe(false);
    expect(resultB.success).toBe(true);
  });
});

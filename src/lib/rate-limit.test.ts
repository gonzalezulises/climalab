import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: vi.fn(),
  })),
}));

import { rateLimit } from "./rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rateLimit", () => {
  it("allows first request", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, remaining: 2 },
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue({
      rpc: mockRpc,
    } as never);

    const result = await rateLimit("test:1", { limit: 3, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "test:1",
      p_limit: 3,
      p_window_ms: 60_000,
    });
  });

  it("blocks after exceeding limit", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: false, remaining: 0 },
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue({
      rpc: mockRpc,
    } as never);

    const result = await rateLimit("test:2", { limit: 3, windowMs: 60_000 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("fails open on RPC error", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });
    vi.mocked(createAdminClient).mockReturnValue({
      rpc: mockRpc,
    } as never);

    const result = await rateLimit("test:3", { limit: 3, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it("fails open on exception", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const result = await rateLimit("test:4", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(5);
  });
});

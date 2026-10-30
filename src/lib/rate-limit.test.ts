import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

import { rateLimit } from "./rate-limit";

beforeEach(() => {
  rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("rateLimit", () => {
  it("passes key, limit and window to the check_rate_limit RPC", async () => {
    rpc.mockResolvedValue({ data: { success: true, remaining: 2 }, error: null });
    await rateLimit("test:1", { limit: 3, windowMs: 60_000 });
    expect(rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "test:1",
      p_limit: 3,
      p_window_ms: 60_000,
    });
  });

  it("returns the RPC verdict when the request is allowed", async () => {
    rpc.mockResolvedValue({ data: { success: true, remaining: 2 }, error: null });
    const result = await rateLimit("test:1", { limit: 3, windowMs: 60_000 });
    expect(result).toEqual({ success: true, remaining: 2 });
  });

  it("returns the RPC verdict when the limit is exceeded", async () => {
    rpc.mockResolvedValue({ data: { success: false, remaining: 0 }, error: null });
    const result = await rateLimit("test:2", { limit: 3, windowMs: 60_000 });
    expect(result).toEqual({ success: false, remaining: 0 });
  });

  it("fails open when the RPC returns an error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = await rateLimit("test:3", { limit: 5, windowMs: 60_000 });
    expect(result).toEqual({ success: true, remaining: 5 });
  });

  it("fails open when the RPC throws", async () => {
    rpc.mockRejectedValue(new Error("network down"));
    const result = await rateLimit("test:4", { limit: 5, windowMs: 60_000 });
    expect(result).toEqual({ success: true, remaining: 5 });
  });
});

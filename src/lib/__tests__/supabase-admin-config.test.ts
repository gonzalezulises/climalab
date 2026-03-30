import { describe, expect, it } from "vitest";
import {
  buildAdminClientRuntimeInfo,
  classifySupabaseKeyFamily,
  resolveAdminSupabaseKey,
} from "@/lib/supabase/admin-config";

describe("supabase admin config", () => {
  it("prefers SUPABASE_SECRET_KEY over legacy service role key", () => {
    const key = resolveAdminSupabaseKey({
      SUPABASE_SECRET_KEY: "sb_secret_new",
      SUPABASE_SERVICE_ROLE_KEY: "eyJlegacy",
    });

    expect(key).toBe("sb_secret_new");
  });

  it("falls back to SUPABASE_SERVICE_ROLE_KEY when secret key is missing", () => {
    const key = resolveAdminSupabaseKey({
      SUPABASE_SERVICE_ROLE_KEY: "eyJlegacy",
    });

    expect(key).toBe("eyJlegacy");
  });

  it("classifies key families without exposing raw values", () => {
    expect(classifySupabaseKeyFamily("sb_secret_123")).toBe("sb_secret");
    expect(classifySupabaseKeyFamily("eyJhbGciOiJIUzI1NiJ9")).toBe("legacy_jwt");
    expect(classifySupabaseKeyFamily("weird-key")).toBe("unknown");
    expect(classifySupabaseKeyFamily("")).toBe("missing");
  });

  it("builds runtime info with source and family", () => {
    expect(
      buildAdminClientRuntimeInfo({
        SUPABASE_SECRET_KEY: "sb_secret_123",
        SUPABASE_SERVICE_ROLE_KEY: "eyJlegacy",
      })
    ).toEqual({
      hasKey: true,
      keySource: "SUPABASE_SECRET_KEY",
      keyFamily: "sb_secret",
    });
  });
});

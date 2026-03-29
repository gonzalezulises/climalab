import { describe, expect, it } from "vitest";
import { normalizeONAStatus } from "@/lib/ona-status";

describe("normalizeONAStatus", () => {
  it("keeps known statuses", () => {
    expect(normalizeONAStatus("pending")).toBe("pending");
    expect(normalizeONAStatus("completed")).toBe("completed");
  });

  it("falls back to failed when there is an error", () => {
    expect(normalizeONAStatus(undefined, "igraph missing")).toBe("failed");
  });
});

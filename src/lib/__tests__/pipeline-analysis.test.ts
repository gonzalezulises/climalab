import { describe, expect, it } from "vitest";
import { isMissingDispatchResponseStore } from "@/lib/pipeline-errors";

describe("isMissingDispatchResponseStore", () => {
  it("returns true for missing pg_net response store errors", () => {
    expect(
      isMissingDispatchResponseStore({
        message: 'relation "net._http_response" does not exist',
      })
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(
      isMissingDispatchResponseStore({
        message: "permission denied for table pipeline_dispatch_events",
      })
    ).toBe(false);
  });
});

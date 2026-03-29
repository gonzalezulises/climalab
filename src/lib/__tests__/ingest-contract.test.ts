import { describe, expect, it } from "vitest";
import {
  INGEST_CONTRACT_VERSION,
  resolveIngestContractVersion,
  sanitizeMetadata,
} from "@/lib/ingest-contract";

describe("resolveIngestContractVersion", () => {
  it("uses the default version when none is provided", () => {
    expect(resolveIngestContractVersion({})).toBe(INGEST_CONTRACT_VERSION);
  });

  it("accepts the supported version from header or body", () => {
    expect(
      resolveIngestContractVersion({
        headerVersion: INGEST_CONTRACT_VERSION,
      })
    ).toBe(INGEST_CONTRACT_VERSION);

    expect(
      resolveIngestContractVersion({
        bodyVersion: INGEST_CONTRACT_VERSION,
      })
    ).toBe(INGEST_CONTRACT_VERSION);
  });

  it("rejects mismatched versions", () => {
    expect(() =>
      resolveIngestContractVersion({
        headerVersion: INGEST_CONTRACT_VERSION,
        bodyVersion: "2026-01-01",
      })
    ).toThrow(/no coincide/);
  });

  it("rejects unsupported versions", () => {
    expect(() =>
      resolveIngestContractVersion({
        headerVersion: "2025-12-31",
      })
    ).toThrow(/no soportada/);
  });
});

describe("sanitizeMetadata", () => {
  it("removes nullish and empty values", () => {
    expect(
      sanitizeMetadata({
        source: "csv",
        empty: "",
        nullable: null,
        missing: undefined,
        row: 2,
      })
    ).toEqual({
      source: "csv",
      row: 2,
    });
  });
});

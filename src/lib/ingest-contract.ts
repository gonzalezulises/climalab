export const INGEST_CONTRACT_VERSION = "2026-03-29";

export type SupportedIngestContractVersion = typeof INGEST_CONTRACT_VERSION;

export function resolveIngestContractVersion(input: {
  headerVersion?: string | null;
  bodyVersion?: string | null;
}) {
  const headerVersion = input.headerVersion?.trim() || null;
  const bodyVersion = input.bodyVersion?.trim() || null;

  if (headerVersion && bodyVersion && headerVersion !== bodyVersion) {
    throw new Error("La version del contrato no coincide entre header y body");
  }

  const version = headerVersion || bodyVersion || INGEST_CONTRACT_VERSION;
  if (version !== INGEST_CONTRACT_VERSION) {
    throw new Error(`Version de contrato no soportada: ${version}`);
  }

  return version as SupportedIngestContractVersion;
}

export function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
}

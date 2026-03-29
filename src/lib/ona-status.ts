export type ONAExecutionStatus = "pending" | "completed" | "deferred" | "failed";

export function normalizeONAStatus(
  status: string | null | undefined,
  errorMessage?: string | null
): ONAExecutionStatus {
  if (!status) {
    return errorMessage ? "failed" : "deferred";
  }

  if (
    status === "completed" ||
    status === "pending" ||
    status === "deferred" ||
    status === "failed"
  ) {
    return status;
  }

  return errorMessage ? "failed" : "deferred";
}

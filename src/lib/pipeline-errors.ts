export function isMissingDispatchResponseStore(
  error: { message?: string | null } | null | undefined
) {
  return /relation "net\._http_response" does not exist/i.test(error?.message ?? "");
}

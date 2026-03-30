export type AdminKeyFamily = "sb_secret" | "legacy_jwt" | "unknown" | "missing";
export type AdminKeySource = "SUPABASE_SECRET_KEY" | "SUPABASE_SERVICE_ROLE_KEY" | "missing";

type AdminEnvLike = {
  SUPABASE_SECRET_KEY?: string | null;
  SUPABASE_SERVICE_ROLE_KEY?: string | null;
};

function normalizeKey(key: string | null | undefined) {
  const trimmed = key?.trim();
  return trimmed ? trimmed : null;
}

export function resolveAdminSupabaseKey(envLike: AdminEnvLike) {
  return (
    normalizeKey(envLike.SUPABASE_SECRET_KEY) ??
    normalizeKey(envLike.SUPABASE_SERVICE_ROLE_KEY) ??
    null
  );
}

export function classifySupabaseKeyFamily(key: string | null | undefined): AdminKeyFamily {
  const normalized = normalizeKey(key);
  if (!normalized) return "missing";
  if (normalized.startsWith("sb_secret_")) return "sb_secret";
  if (normalized.startsWith("eyJ")) return "legacy_jwt";
  return "unknown";
}

export function buildAdminClientRuntimeInfo(envLike: AdminEnvLike) {
  const secretKey = normalizeKey(envLike.SUPABASE_SECRET_KEY);
  const legacyKey = normalizeKey(envLike.SUPABASE_SERVICE_ROLE_KEY);
  const resolvedKey = resolveAdminSupabaseKey(envLike);

  const keySource: AdminKeySource = secretKey
    ? "SUPABASE_SECRET_KEY"
    : legacyKey
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : "missing";

  return {
    hasKey: resolvedKey !== null,
    keySource,
    keyFamily: classifySupabaseKeyFamily(resolvedKey),
  };
}

import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";
import { buildAdminClientRuntimeInfo, resolveAdminSupabaseKey } from "@/lib/supabase/admin-config";

export function getAdminClientRuntimeInfo() {
  return buildAdminClientRuntimeInfo({
    SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export function createAdminClient() {
  const adminKey = resolveAdminSupabaseKey({
    SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!adminKey) {
    throw new Error("No hay una credencial backend de Supabase configurada");
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

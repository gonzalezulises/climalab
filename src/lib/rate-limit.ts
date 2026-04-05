import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Persistent sliding-window rate limiter backed by Supabase.
 * Works correctly across Vercel serverless cold starts, unlike an in-memory Map.
 *
 * Fails open (allows the request) if the Supabase call errors, so a DB
 * hiccup never blocks legitimate traffic.
 */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<{ success: boolean; remaining: number }> {
  try {
    const supabase = createAdminClient();

    // check_rate_limit is a custom SECURITY DEFINER RPC not in the generated Database types.
    const { data, error } = await (supabase as ReturnType<typeof createAdminClient>).rpc(
      "check_rate_limit" as never,
      {
        p_key: key,
        p_limit: opts.limit,
        p_window_ms: opts.windowMs,
      } as never
    );

    if (error) {
      console.error("[rate-limit] RPC error:", error.message);
      return { success: true, remaining: opts.limit };
    }

    return data as { success: boolean; remaining: number };
  } catch (err) {
    console.error("[rate-limit] Unexpected error:", err);
    return { success: true, remaining: opts.limit };
  }
}

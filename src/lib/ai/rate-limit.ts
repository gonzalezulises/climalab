import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function checkAiRateLimit(
  limitPerMin: number,
  keyPrefix = "ai"
): Promise<{ success: false; error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rl = await rateLimit(`${keyPrefix}:${user?.id ?? "anon"}`, {
    limit: limitPerMin,
    windowMs: 60_000,
  });

  if (!rl.success) {
    return { success: false, error: "Demasiadas solicitudes. Intente en un momento." };
  }

  return null;
}

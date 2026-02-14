"use server";

import { createClient } from "@/lib/supabase/server";
import { sendBrandedEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import type { ActionResult, BrandConfig } from "@/types";

export async function sendReminders(
  campaignId: string
): Promise<ActionResult<{ sent: number; skipped: number; failed: number }>> {
  const supabase = await createClient();

  // Rate limit
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rl = rateLimit(`reminder:${user?.id ?? "anon"}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: "Demasiadas solicitudes. Intente en un momento." };
  }

  // Fetch campaign + org
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "id, name, status, ends_at, organization_id, organizations(name, logo_url, brand_config)"
    )
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { success: false, error: "Campaña no encontrada" };
  }

  if (campaign.status !== "active") {
    return { success: false, error: "Solo se pueden enviar recordatorios a campañas activas" };
  }

  const org = campaign.organizations as unknown as {
    name: string;
    logo_url: string | null;
    brand_config: Record<string, unknown> | null;
  } | null;

  // Calculate days remaining
  const daysRemaining = campaign.ends_at
    ? Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86_400_000))
    : undefined;

  // Fetch participants with respondent status
  const { data: participants } = await supabase
    .from("participants")
    .select("id, name, email, respondent_id, respondents(status, token)")
    .eq("campaign_id", campaignId);

  if (!participants || participants.length === 0) {
    return { success: true, data: { sent: 0, skipped: 0, failed: 0 } };
  }

  const baseUrl = env.NEXT_PUBLIC_SITE_URL;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const participant of participants) {
    const resp = participant.respondents as unknown as { status: string; token: string } | null;

    // Skip completed respondents or those without token/email
    if (!resp?.token || !participant.email) {
      skipped++;
      continue;
    }

    if (resp.status === "completed") {
      skipped++;
      continue;
    }

    const surveyUrl = `${baseUrl}/survey/${resp.token}`;

    const result = await sendBrandedEmail({
      to: participant.email,
      type: "reminder",
      participantName: participant.name,
      organizationName: org?.name ?? "",
      campaignName: campaign.name,
      surveyUrl,
      daysRemaining,
      logoUrl: org?.logo_url,
      brandConfig: (org?.brand_config ?? undefined) as Partial<BrandConfig> | undefined,
    });

    if (result.success) {
      await supabase
        .from("participants")
        .update({
          reminded_at: new Date().toISOString(),
          reminder_count:
            ((participant as unknown as { reminder_count: number | null }).reminder_count ?? 0) + 1,
        })
        .eq("id", participant.id);
      sent++;
    } else {
      failed++;
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: { sent, skipped, failed } };
}

export async function getPendingReminderCount(campaignId: string): Promise<ActionResult<number>> {
  const supabase = await createClient();

  const { data: participants } = await supabase
    .from("participants")
    .select("id, respondents(status)")
    .eq("campaign_id", campaignId);

  if (!participants) {
    return { success: true, data: 0 };
  }

  const pending = participants.filter((p) => {
    const resp = p.respondents as unknown as { status: string } | null;
    return resp?.status !== "completed";
  });

  return { success: true, data: pending.length };
}

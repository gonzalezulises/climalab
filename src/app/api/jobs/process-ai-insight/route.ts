import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import {
  analyzeComments,
  contextualizeAlerts,
  generateNarrative,
  generateTrendsNarrative,
  interpretDrivers,
  profileSegments,
} from "@/actions/ai-insights";
import type { CampaignAiInsightType } from "@/lib/ai/contracts";

// Each insight can take up to 120s × 2 (repair loop) = 240s with Ollama 72B.
export const maxDuration = 300;

const INSIGHT_TYPES = [
  "comment_analysis",
  "dashboard_narrative",
  "driver_insights",
  "alert_context",
  "segment_profiles",
  "trends_narrative",
] as const;

const payloadSchema = z.object({
  job_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  insight_type: z.enum(INSIGHT_TYPES),
  batch_id: z.string().uuid(),
});

function assertHookSecret(request: Request): void {
  const secret = env.AI_INSIGHT_HOOK_SECRET;
  if (!secret) {
    // Fail closed in production — require the secret to be configured.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AI_INSIGHT_HOOK_SECRET not configured");
    }
    return; // allow in dev/test without setup
  }

  const provided = request.headers.get("x-hook-secret") ?? "";
  const expectedBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);

  if (
    expectedBuf.length === 0 ||
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new Error("Invalid hook secret");
  }
}

async function runInsight(
  insightType: CampaignAiInsightType,
  campaignId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  switch (insightType) {
    case "comment_analysis":
      return analyzeComments(campaignId);
    case "dashboard_narrative":
      return generateNarrative(campaignId);
    case "driver_insights":
      return interpretDrivers(campaignId);
    case "alert_context":
      return contextualizeAlerts(campaignId);
    case "segment_profiles":
      return profileSegments(campaignId);
    case "trends_narrative":
      return generateTrendsNarrative(organizationId, campaignId);
  }
}

export async function POST(request: Request) {
  try {
    assertHookSecret(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof payloadSchema>;
  try {
    payload = payloadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }

  const { job_id, campaign_id, organization_id, insight_type } = payload;
  const admin = createAdminClient();

  // Atomic claim: increment attempt_count and set status=processing.
  // Returns false if job is already taken, completed, or max_attempts exceeded.
  const { data: claimed } = await admin.rpc(
    "claim_ai_insight_job" as never,
    {
      p_job_id: job_id,
    } as never
  );

  if (!claimed) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const result = await runInsight(insight_type, campaign_id, organization_id);

  if (result.success) {
    await admin
      .from("ai_insight_jobs" as never)
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        error_message: null,
      } as never)
      .eq("id", job_id);

    return NextResponse.json({ ok: true });
  }

  // Mark failed — trigger does NOT re-fire on UPDATE so no infinite loop.
  const errorMsg =
    "error" in result && typeof result.error === "string" ? result.error : "Error desconocido";

  await admin
    .from("ai_insight_jobs" as never)
    .update({
      status: "failed",
      error_message: errorMsg,
    } as never)
    .eq("id", job_id);

  console.error(
    JSON.stringify({
      level: "error",
      service: "ai-insight-processor",
      insight_type,
      campaign_id,
      job_id,
      error: errorMsg,
      ts: new Date().toISOString(),
    })
  );

  return NextResponse.json({ ok: true, failed: true, error: errorMsg });
}

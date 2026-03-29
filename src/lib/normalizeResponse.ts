import "server-only";

import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshCampaignStats } from "@/lib/pipelineAnalysis";
import {
  normalizedSubmissionSchema,
  type NormalizedSubmissionInput,
} from "@/lib/normalizeResponse.schema";

function hashPayload(input: NormalizedSubmissionInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

export async function normalizeResponse(input: NormalizedSubmissionInput) {
  const parsed = normalizedSubmissionSchema.parse(input);
  const admin = createAdminClient();
  const payloadHash = hashPayload(parsed);
  const { data, error } = await admin.rpc("process_normalized_ingest", {
    p_source: parsed.source,
    p_external_event_id: parsed.externalEventId,
    p_campaign_id: parsed.campaignId,
    p_started_at: parsed.startedAt,
    p_completed_at: parsed.completedAt,
    p_demographics: parsed.demographics,
    p_responses: parsed.responses.map((entry) => ({
      item_id: entry.itemId,
      score: entry.score,
    })),
    p_open_responses: parsed.openResponses.map((entry) => ({
      question_type: entry.questionType,
      text: entry.text,
    })),
    p_enps_score: parsed.enpsScore ?? undefined,
    p_payload_hash: payloadHash,
  });

  if (isUniqueViolation(error)) {
    return { duplicate: true as const };
  }

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0];
  if (!result) {
    throw new Error("No se recibió respuesta de la ingestión transaccional");
  }

  if (result.duplicate) {
    return { duplicate: true as const };
  }

  if (!result.ok) {
    throw new Error(result.error_message ?? "No se pudo procesar la ingesta");
  }

  try {
    await refreshCampaignStats(parsed.campaignId);
  } catch (error) {
    console.error("Failed to refresh campaign stats after alternative ingest", {
      campaignId: parsed.campaignId,
      respondentId: result.respondent_id,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

  return {
    duplicate: false as const,
    respondentId: result.respondent_id as string,
  };
}

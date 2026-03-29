import "server-only";

import { createHash } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { zUuid } from "@/lib/validations/uuid";

const normalizedSubmissionSchema = z.object({
  source: z.enum(["webhook", "csv", "api"]),
  externalEventId: z.string().trim().min(1),
  campaignId: zUuid("ID de campaña inválido"),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  demographics: z.object({
    department: z.string().trim().min(1).optional().nullable(),
    tenure: z.string().trim().min(1).optional().nullable(),
    gender: z.string().trim().min(1).optional().nullable(),
  }),
  responses: z
    .array(
      z.object({
        itemId: zUuid("ID de item inválido"),
        score: z.number().int().min(1).max(5),
      })
    )
    .min(1),
  openResponses: z
    .array(
      z.object({
        questionType: z.enum(["strength", "improvement", "general"]),
        text: z.string().trim().min(3).max(2000),
      })
    )
    .optional()
    .default([]),
  enpsScore: z.number().int().min(0).max(10).optional().nullable(),
});

export type NormalizedSubmissionInput = z.infer<typeof normalizedSubmissionSchema>;

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

  const { data: event, error: eventError } = await admin
    .from("ingest_events")
    .insert({
      source: parsed.source,
      external_event_id: parsed.externalEventId,
      campaign_id: parsed.campaignId,
      payload_hash: payloadHash,
      status: "processing",
    })
    .select("id")
    .single();

  if (isUniqueViolation(eventError)) {
    return { duplicate: true as const };
  }

  if (eventError || !event) {
    throw new Error(eventError?.message ?? "No se pudo registrar el evento de ingesta");
  }

  let respondentId: string | null = null;

  try {
    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .select("instrument_id, module_instrument_ids")
      .eq("id", parsed.campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(campaignError?.message ?? "Campaña no encontrada");
    }

    const allInstrumentIds = [campaign.instrument_id, ...(campaign.module_instrument_ids ?? [])];
    const { data: items, error: itemsError } = await admin
      .from("items")
      .select("id, dimension_id, dimensions!inner(instrument_id)")
      .in("dimensions.instrument_id", allInstrumentIds);

    if (itemsError || !items) {
      throw new Error(itemsError?.message ?? "No se pudieron validar los ítems");
    }

    const validItemIds = new Set(items.map((item) => item.id));
    const invalidItem = parsed.responses.find((entry) => !validItemIds.has(entry.itemId));
    if (invalidItem) {
      throw new Error(`El ítem ${invalidItem.itemId} no pertenece a la campaña`);
    }

    const { data: respondent, error: respondentError } = await admin
      .from("respondents")
      .insert({
        campaign_id: parsed.campaignId,
        department: parsed.demographics.department ?? null,
        tenure: parsed.demographics.tenure ?? null,
        gender: parsed.demographics.gender ?? null,
        status: "completed",
        enps_score: parsed.enpsScore ?? null,
        started_at: parsed.startedAt ?? parsed.completedAt ?? new Date().toISOString(),
        completed_at: parsed.completedAt ?? new Date().toISOString(),
      })
      .select("id")
      .single();

    if (respondentError || !respondent) {
      throw new Error(respondentError?.message ?? "No se pudo crear el respondente");
    }

    respondentId = respondent.id;

    const { error: responsesError } = await admin.from("responses").insert(
      parsed.responses.map((entry) => ({
        respondent_id: respondent.id,
        item_id: entry.itemId,
        score: entry.score,
        source: parsed.source,
      }))
    );

    if (responsesError) {
      throw new Error(responsesError.message);
    }

    if (parsed.openResponses.length > 0) {
      const { error: openError } = await admin.from("open_responses").insert(
        parsed.openResponses.map((entry) => ({
          respondent_id: respondent.id,
          question_type: entry.questionType,
          text: entry.text,
        }))
      );

      if (openError) {
        throw new Error(openError.message);
      }
    }

    const { error: updateEventError } = await admin
      .from("ingest_events")
      .update({
        respondent_id: respondent.id,
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (updateEventError) {
      throw new Error(updateEventError.message);
    }

    return { duplicate: false as const, respondentId: respondent.id };
  } catch (error) {
    if (respondentId) {
      await admin.from("respondents").delete().eq("id", respondentId);
    }

    await admin
      .from("ingest_events")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Fallo desconocido",
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    throw error;
  }
}

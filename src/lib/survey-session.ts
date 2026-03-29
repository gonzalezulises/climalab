import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshCampaignStats } from "@/lib/pipelineAnalysis";
import { zUuid } from "@/lib/validations/uuid";

const scoreSchema = z.object({
  itemId: zUuid("ID de item inválido"),
  score: z.number().int().min(1).max(5),
});

const demographicsSchema = z.object({
  department: z.string().trim().min(1),
  tenure: z.string().trim().min(1),
  gender: z.string().trim().optional().nullable(),
});

const openResponseSchema = z.object({
  questionType: z.enum(["strength", "improvement", "general"]),
  text: z.string().trim().min(3).max(2000),
});

export type SurveyScoreInput = z.infer<typeof scoreSchema>;
export type SurveyDemographicsInput = z.infer<typeof demographicsSchema>;
export type SurveyOpenResponseInput = z.infer<typeof openResponseSchema>;

export async function getSurveySessionByToken(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("respondents")
    .select("id, campaign_id, token, status, department, tenure, gender")
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function createSurveySession(campaignId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("respondents")
    .insert({ campaign_id: campaignId })
    .select("id, token")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la sesión de encuesta");
  }

  return data;
}

export async function startSurveySession(token: string) {
  const session = await getSurveySessionByToken(token);
  if (!session) {
    throw new Error("Sesión de encuesta no encontrada");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("respondents")
    .update({
      status: session.status === "pending" ? "in_progress" : session.status,
      started_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveSurveyDemographics(token: string, input: SurveyDemographicsInput) {
  const session = await getSurveySessionByToken(token);
  if (!session) {
    throw new Error("Sesión de encuesta no encontrada");
  }

  const parsed = demographicsSchema.parse(input);
  const admin = createAdminClient();
  const { error } = await admin
    .from("respondents")
    .update({
      department: parsed.department,
      tenure: parsed.tenure,
      gender: parsed.gender || null,
      status: session.status === "pending" ? "in_progress" : session.status,
      started_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveSurveyResponses(token: string, items: SurveyScoreInput[]) {
  const session = await getSurveySessionByToken(token);
  if (!session) {
    throw new Error("Sesión de encuesta no encontrada");
  }

  const parsed = z.array(scoreSchema).min(1).parse(items);
  const admin = createAdminClient();
  const rows = parsed.map((item) => ({
    respondent_id: session.id,
    item_id: item.itemId,
    score: item.score,
    source: "web" as const,
  }));

  const { error } = await admin.from("responses").upsert(rows, {
    onConflict: "respondent_id,item_id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function completeSurveySession(args: {
  token: string;
  enpsScore?: number | null;
  openResponses?: SurveyOpenResponseInput[];
}) {
  const session = await getSurveySessionByToken(args.token);
  if (!session) {
    throw new Error("Sesión de encuesta no encontrada");
  }

  const parsedOpen = z.array(openResponseSchema).parse(args.openResponses ?? []);
  const parsedEnps = z
    .number()
    .int()
    .min(0)
    .max(10)
    .nullable()
    .optional()
    .parse(args.enpsScore ?? null);
  const admin = createAdminClient();

  if (parsedOpen.length > 0) {
    const { error: deleteOpenError } = await admin
      .from("open_responses")
      .delete()
      .eq("respondent_id", session.id);

    if (deleteOpenError) {
      throw new Error(deleteOpenError.message);
    }

    const { error: insertOpenError } = await admin.from("open_responses").insert(
      parsedOpen.map((entry) => ({
        respondent_id: session.id,
        question_type: entry.questionType,
        text: entry.text,
      }))
    );

    if (insertOpenError) {
      throw new Error(insertOpenError.message);
    }
  }

  const { error: updateError } = await admin
    .from("respondents")
    .update({
      status: "completed",
      enps_score: parsedEnps,
      completed_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await refreshCampaignStats(session.campaign_id);
}

"use server";

import { revalidatePath } from "next/cache";
import {
  listCampaignAiGenerationEvents,
  listCampaignAiInsights,
  updateCampaignAiInsightStatus,
} from "@/lib/ai/persistence";
import {
  extractInsightGovernance,
  type CampaignAiInsightStatus,
  type CampaignAiInsightType,
} from "@/lib/ai/contracts";
import { summarizeAiGovernance } from "@/lib/ai/governance";
import type { ActionResult } from "@/types";

export async function getCampaignAiGovernance(campaignId: string): Promise<
  ActionResult<{
    summary: ReturnType<typeof summarizeAiGovernance>;
    insights: Array<{
      id: string;
      insightType: string;
      status: string | null;
      provider: string | null;
      model: string | null;
      promptVersion: string | null;
      schemaVersion: string | null;
      generatedAt: string | null;
      publishedAt: string | null;
      warnings: string[];
      validationErrors: string[];
      claimCount: number;
      summary: string | null;
    }>;
    events: Array<{
      id: string;
      insightType: string;
      status: string;
      provider: string | null;
      model: string | null;
      latencyMs: number | null;
      createdAt: string;
      errorMessage: string | null;
    }>;
  }>
> {
  try {
    const [insights, events] = await Promise.all([
      listCampaignAiInsights(campaignId),
      listCampaignAiGenerationEvents(campaignId),
    ]);

    const summary = summarizeAiGovernance({ insights, events });

    return {
      success: true,
      data: {
        summary,
        insights: insights.map((insight) => {
          const governance = extractInsightGovernance(insight.data);
          return {
            id: insight.id,
            insightType: insight.insight_type,
            status: insight.status,
            provider: insight.provider,
            model: insight.model,
            promptVersion: insight.prompt_version,
            schemaVersion: insight.schema_version,
            generatedAt: insight.generated_at,
            publishedAt: insight.published_at,
            warnings: Array.isArray(insight.warnings)
              ? insight.warnings.filter((entry): entry is string => typeof entry === "string")
              : [],
            validationErrors: Array.isArray(insight.validation_errors)
              ? insight.validation_errors.filter(
                  (entry): entry is string => typeof entry === "string"
                )
              : [],
            claimCount: governance?.claims.length ?? 0,
            summary: governance?.summary ?? null,
          };
        }),
        events: events.map((event) => ({
          id: event.id,
          insightType: event.insight_type,
          status: event.status,
          provider: event.provider,
          model: event.model,
          latencyMs: event.latency_ms,
          createdAt: event.created_at,
          errorMessage: event.error_message,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo cargar la gobernanza de IA",
    };
  }
}

export async function setCampaignAiInsightStatus(input: {
  campaignId: string;
  insightType: CampaignAiInsightType;
  status: CampaignAiInsightStatus;
}): Promise<ActionResult<void>> {
  try {
    await updateCampaignAiInsightStatus(input.campaignId, input.insightType, input.status);
    revalidatePath(`/campaigns/${input.campaignId}/results/quality`);
    revalidatePath(`/campaigns/${input.campaignId}/results/ai-governance`);
    revalidatePath(`/campaigns/${input.campaignId}/results/dashboard`);
    revalidatePath(`/campaigns/${input.campaignId}/results/comments`);
    revalidatePath(`/campaigns/${input.campaignId}/results/drivers`);
    revalidatePath(`/campaigns/${input.campaignId}/results/alerts`);
    revalidatePath(`/campaigns/${input.campaignId}/results/segments`);
    revalidatePath(`/campaigns/${input.campaignId}/results/trends`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar el estado del insight",
    };
  }
}

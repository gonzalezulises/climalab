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
import { listCampaignAiEvidence } from "@/lib/excellence/store";
import type { ActionResult } from "@/types";

function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

export async function getCampaignAiGovernance(campaignId: string): Promise<
  ActionResult<{
    summary: ReturnType<typeof summarizeAiGovernance>;
    evidenceCoverage: {
      claimCount: number;
      insightTypes: string[];
    };
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
    evidence: Array<{
      id: string;
      insightType: string;
      claimKey: string;
      claimText: string;
      evidence: string[];
      metricRefs: string[];
      dimensionCodes: string[];
      confidenceLabel: string;
      policyWarnings: string[];
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
    const evidence = await listCampaignAiEvidence(campaignId);

    const summary = summarizeAiGovernance({ insights, events });

    return {
      success: true,
      data: {
        summary,
        evidenceCoverage: {
          claimCount: evidence.length,
          insightTypes: [...new Set(evidence.map((row) => row.insight_type))],
        },
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
            warnings: safeStringArray(insight.warnings),
            validationErrors: safeStringArray(insight.validation_errors),
            claimCount: governance?.claims.length ?? 0,
            summary: governance?.summary ?? null,
          };
        }),
        evidence: evidence.map((row) => ({
          id: row.id,
          insightType: row.insight_type,
          claimKey: row.claim_key,
          claimText: row.claim_text,
          evidence: safeStringArray(row.evidence),
          metricRefs: safeStringArray(row.metric_refs),
          dimensionCodes: safeStringArray(row.dimension_codes),
          confidenceLabel: row.confidence_label,
          policyWarnings: safeStringArray(row.policy_warnings),
        })),
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
    if (input.status === "published") {
      const evidence = await listCampaignAiEvidence(input.campaignId);
      const claimCount = evidence.filter((row) => row.insight_type === input.insightType).length;
      if (claimCount === 0) {
        return {
          success: false,
          error: "No se puede publicar un insight sin evidencia estructurada",
        };
      }
    }

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

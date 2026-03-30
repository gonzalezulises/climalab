import { createHash } from "crypto";
import { ZodError } from "zod";
import {
  buildGovernedInsightEnvelope,
  type CampaignAiInsightType,
  type CampaignAiInsightStatus,
} from "@/lib/ai/contracts";
import { extractJSON } from "@/lib/ai/json";
import { normalizeInsightClaims, extractInsightSummary } from "@/lib/ai/normalize";
import { buildAiEvidenceRows } from "@/lib/ai/evidence";
import {
  insertCampaignAiGenerationEvent,
  type CampaignAiInsightInsert,
  type CampaignAiGenerationEventInsert,
} from "@/lib/ai/persistence";
import { callAI, getAiProviderMetadata } from "@/lib/ai/provider";
import { getAiPromptRegistryEntry } from "@/lib/ai/registry";
import type { ActionResult } from "@/types";

type GenerateGovernedInsightInput = {
  campaignId: string;
  analysisRunId?: string | null;
  insightType: CampaignAiInsightType;
  userContent: string;
  dimensions?: Array<{ code: string; name: string }>;
  qualityCautions?: string[];
  status?: CampaignAiInsightStatus;
  options?: {
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  };
};

type GenerateGovernedInsightOutput = {
  insert: CampaignAiInsightInsert;
  content: unknown;
  warnings: string[];
  evidenceRows: Array<{
    campaign_id: string;
    analysis_run_id: string | null;
    insight_type: CampaignAiInsightType;
    claim_key: string;
    claim_text: string;
    evidence: string[];
    metric_refs: string[];
    dimension_codes: string[];
    confidence_label: "low" | "medium" | "high";
    policy_warnings: string[];
  }>;
};

function fingerprintInput(userContent: string) {
  return createHash("sha256").update(userContent).digest("hex");
}

function formatValidationErrors(error: ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
}

async function persistGenerationEvent(event: CampaignAiGenerationEventInsert) {
  try {
    await insertCampaignAiGenerationEvent(event);
  } catch {
    // Event persistence must not break the UX path.
  }
}

export async function generateGovernedInsight(
  input: GenerateGovernedInsightInput
): Promise<ActionResult<GenerateGovernedInsightOutput>> {
  const registry = getAiPromptRegistryEntry(input.insightType);
  const aiMetadata = getAiProviderMetadata();
  const startedAt = Date.now();
  const inputFingerprint = fingerprintInput(input.userContent);

  const firstAttempt = await callAI(registry.systemPrompt, input.userContent, input.options);

  if (!firstAttempt.success) {
    await persistGenerationEvent({
      campaign_id: input.campaignId,
      analysis_run_id: input.analysisRunId ?? null,
      insight_type: input.insightType,
      provider: aiMetadata.provider,
      model: aiMetadata.model,
      prompt_version: registry.contract.promptVersion,
      schema_version: registry.contract.schemaVersion,
      status: "failed",
      error_message: firstAttempt.error,
      latency_ms: Date.now() - startedAt,
      raw_excerpt: null,
      input_fingerprint: inputFingerprint,
      warnings: [],
      validation_errors: [],
    });
    return firstAttempt;
  }

  const firstPayload = extractJSON(firstAttempt.data);
  const firstValidation = registry.contract.schema.safeParse(firstPayload);

  let finalValidation = firstValidation;
  let finalRaw = firstAttempt.data;
  const warnings: string[] = [];

  if (!firstValidation.success) {
    warnings.push("repair_attempted");
    const repairPrompt = [
      input.userContent,
      "",
      "El JSON previo no cumple el contrato requerido.",
      "Corrige únicamente la estructura y responde solo con JSON válido.",
      "Errores de validación:",
      ...formatValidationErrors(firstValidation.error).map((line) => `- ${line}`),
      "",
      "Respuesta previa:",
      firstAttempt.data,
    ].join("\n");

    const repairAttempt = await callAI(registry.systemPrompt, repairPrompt, input.options);

    if (!repairAttempt.success) {
      await persistGenerationEvent({
        campaign_id: input.campaignId,
        analysis_run_id: input.analysisRunId ?? null,
        insight_type: input.insightType,
        provider: aiMetadata.provider,
        model: aiMetadata.model,
        prompt_version: registry.contract.promptVersion,
        schema_version: registry.contract.schemaVersion,
        status: "failed",
        error_message: repairAttempt.error,
        latency_ms: Date.now() - startedAt,
        raw_excerpt: firstAttempt.data.slice(0, 500),
        input_fingerprint: inputFingerprint,
        warnings,
        validation_errors: formatValidationErrors(firstValidation.error),
      });
      return repairAttempt;
    }

    finalRaw = repairAttempt.data;
    finalValidation = registry.contract.schema.safeParse(extractJSON(repairAttempt.data));
  }

  if (!finalValidation.success) {
    await persistGenerationEvent({
      campaign_id: input.campaignId,
      analysis_run_id: input.analysisRunId ?? null,
      insight_type: input.insightType,
      provider: aiMetadata.provider,
      model: aiMetadata.model,
      prompt_version: registry.contract.promptVersion,
      schema_version: registry.contract.schemaVersion,
      status: "failed",
      error_message: "validation_failed",
      latency_ms: Date.now() - startedAt,
      raw_excerpt: finalRaw.slice(0, 500),
      input_fingerprint: inputFingerprint,
      warnings,
      validation_errors: formatValidationErrors(finalValidation.error),
    });

    return {
      success: false,
      error: "El modelo no devolvió un payload válido para este insight",
    };
  }

  const claims = normalizeInsightClaims(finalValidation.data as never, {
    insightType: input.insightType,
    dimensions: input.dimensions,
    qualityCautions: input.qualityCautions,
  });
  const envelope = buildGovernedInsightEnvelope({
    contract: registry.contract,
    content: finalValidation.data as never,
    claims,
    qualityCautions: input.qualityCautions,
    warnings,
    summary: extractInsightSummary(finalValidation.data as never, input.insightType),
  });

  const status = input.status ?? "published";
  const now = new Date().toISOString();
  const insert: CampaignAiInsightInsert = {
    campaign_id: input.campaignId,
    insight_type: input.insightType,
    provider: aiMetadata.provider,
    model: aiMetadata.model,
    data: envelope,
    status,
    prompt_version: registry.contract.promptVersion,
    schema_version: registry.contract.schemaVersion,
    input_fingerprint: inputFingerprint,
    warnings,
    validation_errors: [],
    generated_at: now,
    published_at: status === "published" ? now : null,
  };
  const evidenceRows = buildAiEvidenceRows({
    campaignId: input.campaignId,
    analysisRunId: input.analysisRunId ?? null,
    insightType: input.insightType,
    governance: {
      claims: claims.map((claim, index) => ({
        key: `${input.insightType}_${index + 1}`,
        statement: claim.statement,
        evidence: claim.metricRefs,
        dimensionCodes: claim.dimensionCodes,
        metricRefs: claim.metricRefs,
        confidenceLabel: claim.confidence,
        warnings: [],
      })),
    },
  });

  await persistGenerationEvent({
    campaign_id: input.campaignId,
    analysis_run_id: input.analysisRunId ?? null,
    insight_type: input.insightType,
    provider: aiMetadata.provider,
    model: aiMetadata.model,
    prompt_version: registry.contract.promptVersion,
    schema_version: registry.contract.schemaVersion,
    status: warnings.length > 0 ? "repaired" : "generated",
    error_message: null,
    latency_ms: Date.now() - startedAt,
    raw_excerpt: finalRaw.slice(0, 500),
    input_fingerprint: inputFingerprint,
    warnings,
    validation_errors: [],
  });

  return {
    success: true,
    data: {
      insert,
      content: finalValidation.data,
      warnings,
      evidenceRows,
    },
  };
}

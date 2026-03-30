type InsightType =
  | "comment_analysis"
  | "dashboard_narrative"
  | "driver_insights"
  | "alert_context"
  | "segment_profiles"
  | "trends_narrative";

type CampaignQualityStatus = "robusto" | "aceptable" | "precaucion" | "no_interpretable";

export type AiEvaluationInsightInput = {
  insightType: InsightType;
  provider: string | null;
  model: string | null;
  status?: string | null;
  promptVersion?: string | null;
  schemaVersion?: string | null;
  warnings?: string[];
  validationErrors?: string[];
  evidenceClaimCount?: number;
  data: unknown;
};

export type AiEvaluationInput = {
  campaignQualityStatus: CampaignQualityStatus;
  qualityWarnings: string[];
  dimensions: Array<{
    code: string;
    name: string;
    avgScore: number;
    favorabilityPct: number;
  }>;
  drivers: Array<{ code: string; name: string; r: number }>;
  alerts: Array<{ severity: string; dimensionCode?: string | null; message: string }>;
  insightTypes: AiEvaluationInsightInput[];
};

export type AiEvaluationRow = {
  insightType: InsightType;
  provider: string | null;
  model: string | null;
  status: string | null;
  promptVersion: string | null;
  schemaVersion: string | null;
  methodological: {
    dataFidelityScore: number;
    coverageScore: number;
    calibrationScore: number;
    actionabilityScore: number;
    evidenceCoverageScore: number;
    overallScore: number;
  };
  warnings: string[];
  claimCount: number;
};

export type AiEvaluationMatrix = {
  coverage: {
    expectedInsightTypes: number;
    generatedInsightTypes: number;
    missingInsightTypes: InsightType[];
  };
  methodological: {
    overallScore: number;
  };
  operational: {
    overallScore: number;
    successRatePct: number;
    providers: string[];
    models: string[];
  };
  rows: AiEvaluationRow[];
  warnings: string[];
};

const EXPECTED_INSIGHT_TYPES: InsightType[] = [
  "comment_analysis",
  "dashboard_narrative",
  "driver_insights",
  "alert_context",
  "segment_profiles",
];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return round((numerator / denominator) * 100);
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((entry) => collectStrings(entry));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      collectStrings(entry)
    );
  }
  return [];
}

function detectUnsupportedDimensionReferences(texts: string[], allowedCodes: Set<string>) {
  const unsupported = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(/\b[A-Z]{3,5}\b/g)) {
      const token = match[0];
      if (!allowedCodes.has(token)) {
        unsupported.add(token);
      }
    }
  }
  return [...unsupported];
}

function detectSupportedMentions(
  texts: string[],
  dimensions: Array<{ code: string; name: string }>
) {
  const haystack = texts.join(" ").toLowerCase();
  return dimensions.filter(
    (dimension) =>
      haystack.includes(dimension.code.toLowerCase()) ||
      haystack.includes(dimension.name.toLowerCase())
  ).length;
}

function hasCautionLanguage(texts: string[]) {
  const haystack = texts.join(" ").toLowerCase();
  return /(precau|cautela|limitaci|interpretar con cuidado|muestra|baja confiabilidad|bajo n)/.test(
    haystack
  );
}

function computeActionabilityScore(insightType: InsightType, data: unknown) {
  if (!data || typeof data !== "object") return 25;

  if (insightType === "driver_insights") {
    const quickWins = Array.isArray((data as { quick_wins?: unknown[] }).quick_wins)
      ? (data as { quick_wins: unknown[] }).quick_wins.length
      : 0;
    return quickWins > 0 ? 95 : 55;
  }

  if (insightType === "alert_context") {
    return Array.isArray(data) && data.length > 0 ? 90 : 45;
  }

  const texts = collectStrings(data);
  return texts.some((text) => text.length >= 24) ? 80 : 40;
}

function computeCoverageScore(texts: string[], supportedMentions: number) {
  if (texts.length === 0) return 20;
  if (supportedMentions >= 2) return 95;
  if (supportedMentions >= 1) return 80;
  return 55;
}

export function buildAiEvaluationMatrix(input: AiEvaluationInput): AiEvaluationMatrix {
  const dimensionCatalog = input.dimensions.map((dimension) => ({
    code: dimension.code,
    name: dimension.name,
  }));
  const allowedCodes = new Set(dimensionCatalog.map((dimension) => dimension.code));

  const rows = input.insightTypes.map<AiEvaluationRow>((insight) => {
    const texts = collectStrings(insight.data);
    const unsupportedReferences = detectUnsupportedDimensionReferences(texts, allowedCodes);
    const supportedMentions = detectSupportedMentions(texts, dimensionCatalog);
    const warnings: string[] = [];

    let dataFidelityScore = 100;
    if (unsupportedReferences.length > 0) {
      dataFidelityScore = Math.max(35, 100 - unsupportedReferences.length * 30);
      warnings.push("unsupported_dimension_references");
    }

    const coverageScore = computeCoverageScore(texts, supportedMentions);
    const EVIDENCE_BASE_SCORE = 60;
    const EVIDENCE_SCORE_PER_CLAIM = 20;
    const NO_EVIDENCE_SCORE = 25;
    const evidenceCoverageScore =
      insight.evidenceClaimCount && insight.evidenceClaimCount > 0
        ? Math.min(100, EVIDENCE_BASE_SCORE + insight.evidenceClaimCount * EVIDENCE_SCORE_PER_CLAIM)
        : NO_EVIDENCE_SCORE;
    if (!insight.evidenceClaimCount) {
      warnings.push("missing_evidence");
    }
    let calibrationScore = 92;
    if (
      (input.campaignQualityStatus === "precaucion" ||
        input.campaignQualityStatus === "no_interpretable" ||
        input.qualityWarnings.length > 0) &&
      !hasCautionLanguage(texts)
    ) {
      calibrationScore = 55;
      warnings.push("missing_quality_caution");
    }

    const actionabilityScore = computeActionabilityScore(insight.insightType, insight.data);
    const overallScore = round(
      (dataFidelityScore +
        coverageScore +
        calibrationScore +
        actionabilityScore +
        evidenceCoverageScore) /
        5
    );

    return {
      insightType: insight.insightType,
      provider: insight.provider,
      model: insight.model,
      status: insight.status ?? null,
      promptVersion: insight.promptVersion ?? null,
      schemaVersion: insight.schemaVersion ?? null,
      methodological: {
        dataFidelityScore,
        coverageScore,
        calibrationScore,
        actionabilityScore,
        evidenceCoverageScore,
        overallScore,
      },
      claimCount: insight.evidenceClaimCount ?? 0,
      warnings: [
        ...new Set([...(insight.warnings ?? []), ...warnings, ...(insight.validationErrors ?? [])]),
      ],
    };
  });

  const generatedInsightTypes = rows.length;
  const missingInsightTypes = EXPECTED_INSIGHT_TYPES.filter(
    (insightType) => !rows.some((row) => row.insightType === insightType)
  );

  const successRatePct = pct(generatedInsightTypes, EXPECTED_INSIGHT_TYPES.length);
  const operationalScore = round(successRatePct * 0.8 + (generatedInsightTypes > 0 ? 20 : 0));
  const methodologicalOverallScore =
    rows.length > 0
      ? round(rows.reduce((sum, row) => sum + row.methodological.overallScore, 0) / rows.length)
      : 0;

  const warnings = [];
  if (generatedInsightTypes === 0) warnings.push("missing_ai_outputs");
  if (missingInsightTypes.length > 0) warnings.push("partial_ai_coverage");

  return {
    coverage: {
      expectedInsightTypes: EXPECTED_INSIGHT_TYPES.length,
      generatedInsightTypes,
      missingInsightTypes,
    },
    methodological: {
      overallScore: methodologicalOverallScore,
    },
    operational: {
      overallScore: operationalScore,
      successRatePct,
      providers: [...new Set(rows.map((row) => row.provider).filter(Boolean) as string[])],
      models: [...new Set(rows.map((row) => row.model).filter(Boolean) as string[])],
    },
    rows,
    warnings,
  };
}

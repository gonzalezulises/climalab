import { z } from "zod";

export type CampaignAiInsightType =
  | "comment_analysis"
  | "dashboard_narrative"
  | "driver_insights"
  | "alert_context"
  | "segment_profiles"
  | "trends_narrative";

export type CampaignAiInsightStatus = "draft" | "approved" | "published" | "rejected" | "failed";

export type GovernedInsightConfidence = "low" | "medium" | "high";

export type GovernedInsightClaim = {
  statement: string;
  dimensionCodes: string[];
  metricRefs: string[];
  confidence: GovernedInsightConfidence;
};

export type GovernedInsightEnvelope<T> = {
  content: T;
  governance: {
    promptVersion: string;
    schemaVersion: string;
    generatedAt: string;
    summary: string;
    claims: GovernedInsightClaim[];
    qualityCautions: string[];
    warnings: string[];
  };
};

const themeSchema = z.object({
  theme: z.string().min(1),
  count: z.number().int().nonnegative(),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  examples: z.array(z.string().min(1)),
});

const commentAnalysisSchema = z.object({
  themes: z.array(themeSchema),
  summary: z.object({
    strengths: z.string().min(1),
    improvements: z.string().min(1),
    general: z.string().min(1),
  }),
  sentiment_distribution: z.object({
    positive: z.number().int().nonnegative(),
    negative: z.number().int().nonnegative(),
    neutral: z.number().int().nonnegative(),
  }),
});

const dashboardNarrativeSchema = z.object({
  executive_summary: z.string().min(1),
  highlights: z.array(z.string().min(1)),
  concerns: z.array(z.string().min(1)),
  recommendation: z.string().min(1),
});

const driverInsightsSchema = z.object({
  narrative: z.string().min(1),
  paradoxes: z.array(z.string().min(1)),
  quick_wins: z.array(
    z.object({
      dimension: z.string().min(1),
      action: z.string().min(1),
      impact: z.string().min(1),
    })
  ),
});

const alertContextSchema = z.array(
  z.object({
    alert_index: z.number().int().nonnegative(),
    root_cause: z.string().min(1),
    recommendation: z.string().min(1),
  })
);

const segmentProfilesSchema = z.array(
  z.object({
    segment: z.string().min(1),
    segment_type: z.enum(["department", "tenure", "gender"]),
    narrative: z.string().min(1),
    strengths: z.array(z.string().min(1)),
    risks: z.array(z.string().min(1)),
  })
);

const trendsNarrativeSchema = z.object({
  trajectory: z.string().min(1),
  improving: z.array(z.string().min(1)),
  declining: z.array(z.string().min(1)),
  stable: z.array(z.string().min(1)),
  inflection_points: z.array(z.string().min(1)),
});

export type CommentAnalysis = z.infer<typeof commentAnalysisSchema>;
export type DashboardNarrative = z.infer<typeof dashboardNarrativeSchema>;
export type DriverInsights = z.infer<typeof driverInsightsSchema>;
export type AlertContext = z.infer<typeof alertContextSchema>;
export type SegmentProfiles = z.infer<typeof segmentProfilesSchema>;
export type TrendsNarrative = z.infer<typeof trendsNarrativeSchema>;

const claimSchema = z.object({
  statement: z.string().min(1),
  dimensionCodes: z.array(z.string().min(1)),
  metricRefs: z.array(z.string().min(1)),
  confidence: z.enum(["low", "medium", "high"]),
});

const governanceSchema = z.object({
  promptVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  summary: z.string().min(1),
  claims: z.array(claimSchema),
  qualityCautions: z.array(z.string().min(1)),
  warnings: z.array(z.string().min(1)),
});

export const insightSchemas = {
  comment_analysis: commentAnalysisSchema,
  dashboard_narrative: dashboardNarrativeSchema,
  driver_insights: driverInsightsSchema,
  alert_context: alertContextSchema,
  segment_profiles: segmentProfilesSchema,
  trends_narrative: trendsNarrativeSchema,
} as const;

export type InsightContract<TInsightType extends CampaignAiInsightType = CampaignAiInsightType> = {
  insightType: TInsightType;
  promptVersion: string;
  schemaVersion: string;
  schema: (typeof insightSchemas)[TInsightType];
};

const INSIGHT_CONTRACTS: {
  [K in CampaignAiInsightType]: InsightContract<K>;
} = {
  comment_analysis: {
    insightType: "comment_analysis",
    promptVersion: "2026-03-30-v1",
    schemaVersion: "comment-analysis-v1",
    schema: commentAnalysisSchema,
  },
  dashboard_narrative: {
    insightType: "dashboard_narrative",
    promptVersion: "2026-03-30-v1",
    schemaVersion: "dashboard-narrative-v1",
    schema: dashboardNarrativeSchema,
  },
  driver_insights: {
    insightType: "driver_insights",
    promptVersion: "2026-03-30-v1",
    schemaVersion: "driver-insights-v1",
    schema: driverInsightsSchema,
  },
  alert_context: {
    insightType: "alert_context",
    promptVersion: "2026-03-30-v1",
    schemaVersion: "alert-context-v1",
    schema: alertContextSchema,
  },
  segment_profiles: {
    insightType: "segment_profiles",
    promptVersion: "2026-03-30-v1",
    schemaVersion: "segment-profiles-v1",
    schema: segmentProfilesSchema,
  },
  trends_narrative: {
    insightType: "trends_narrative",
    promptVersion: "2026-03-30-v1",
    schemaVersion: "trends-narrative-v1",
    schema: trendsNarrativeSchema,
  },
};

export function getInsightContract<TInsightType extends CampaignAiInsightType>(
  insightType: TInsightType
) {
  return INSIGHT_CONTRACTS[insightType];
}

export function validateInsightPayload<TInsightType extends CampaignAiInsightType>(
  insightType: TInsightType,
  payload: unknown
) {
  const contract = getInsightContract(insightType);
  const parsed = contract.schema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error,
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

export function buildGovernedInsightEnvelope<TInsightType extends CampaignAiInsightType>(input: {
  contract: InsightContract<TInsightType>;
  content: z.infer<(typeof insightSchemas)[TInsightType]>;
  claims: GovernedInsightClaim[];
  qualityCautions?: string[];
  warnings?: string[];
  summary?: string;
}) {
  const summary =
    input.summary ??
    collectStrings(input.content).find((value) => value.trim().length > 0) ??
    "Insight generado";

  const envelope = {
    content: input.content,
    governance: {
      promptVersion: input.contract.promptVersion,
      schemaVersion: input.contract.schemaVersion,
      generatedAt: new Date().toISOString(),
      summary,
      claims: input.claims,
      qualityCautions: input.qualityCautions ?? [],
      warnings: input.warnings ?? [],
    },
  };

  return envelope as GovernedInsightEnvelope<z.infer<(typeof insightSchemas)[TInsightType]>>;
}

export function extractInsightContent<T>(payload: unknown): T {
  const parsedEnvelope = z
    .object({
      content: z.unknown(),
      governance: governanceSchema,
    })
    .safeParse(payload);

  if (parsedEnvelope.success) {
    return parsedEnvelope.data.content as T;
  }

  return payload as T;
}

export function extractInsightGovernance(payload: unknown) {
  const parsedEnvelope = z
    .object({
      content: z.unknown(),
      governance: governanceSchema,
    })
    .safeParse(payload);

  return parsedEnvelope.success ? parsedEnvelope.data.governance : null;
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

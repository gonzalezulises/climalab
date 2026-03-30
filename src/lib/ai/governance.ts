import type { CampaignAiInsightStatus } from "@/lib/ai/contracts";

type GovernanceInsightRow = {
  insight_type: string;
  status: string | null;
  provider: string | null;
  model: string | null;
  prompt_version: string | null;
  schema_version: string | null;
  warnings: unknown;
  validation_errors: unknown;
};

type GovernanceEventRow = {
  status: string;
  insight_type: string;
  provider: string | null;
  model: string | null;
};

const EXPECTED_INSIGHT_TYPES = [
  "comment_analysis",
  "dashboard_narrative",
  "driver_insights",
  "alert_context",
  "segment_profiles",
  "trends_narrative",
] as const;

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function summarizeAiGovernance(input: {
  insights: GovernanceInsightRow[];
  events: GovernanceEventRow[];
}) {
  const statusCounts: Record<CampaignAiInsightStatus, number> = {
    draft: 0,
    approved: 0,
    published: 0,
    rejected: 0,
    failed: 0,
  };

  for (const insight of input.insights) {
    if (insight.status && insight.status in statusCounts) {
      statusCounts[insight.status as CampaignAiInsightStatus] += 1;
    }
  }

  const failureCount = input.events.filter((event) => event.status === "failed").length;
  const providers = [
    ...new Set(input.insights.map((row) => row.provider).filter(Boolean) as string[]),
  ];
  const models = [...new Set(input.insights.map((row) => row.model).filter(Boolean) as string[])];
  const promptVersions = [
    ...new Set(input.insights.map((row) => row.prompt_version).filter(Boolean) as string[]),
  ];
  const schemaVersions = [
    ...new Set(input.insights.map((row) => row.schema_version).filter(Boolean) as string[]),
  ];
  const warningCount = input.insights.reduce(
    (sum, row) => sum + stringArray(row.warnings).length,
    0
  );
  const validationErrorCount = input.insights.reduce(
    (sum, row) => sum + stringArray(row.validation_errors).length,
    0
  );

  return {
    coverage: {
      expected: EXPECTED_INSIGHT_TYPES.length,
      generated: input.insights.length,
      missing: EXPECTED_INSIGHT_TYPES.filter(
        (insightType) => !input.insights.some((row) => row.insight_type === insightType)
      ),
    },
    statusCounts,
    failureCount,
    warningCount,
    validationErrorCount,
    providers,
    models,
    promptVersions,
    schemaVersions,
  };
}

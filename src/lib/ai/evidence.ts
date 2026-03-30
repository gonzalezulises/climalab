import type { CampaignAiInsightType } from "@/lib/ai/contracts";

type EvidenceClaim = {
  key: string;
  statement: string;
  evidence: string[];
  dimensionCodes: string[];
  metricRefs: string[];
  confidenceLabel: "low" | "medium" | "high";
  warnings?: string[];
};

export function buildAiEvidenceRows(input: {
  campaignId: string;
  analysisRunId: string | null;
  insightType: CampaignAiInsightType;
  governance: {
    claims: EvidenceClaim[];
  };
}) {
  return input.governance.claims.map((claim) => ({
    campaign_id: input.campaignId,
    analysis_run_id: input.analysisRunId,
    insight_type: input.insightType,
    claim_key: claim.key,
    claim_text: claim.statement,
    evidence: claim.evidence,
    metric_refs: claim.metricRefs,
    dimension_codes: claim.dimensionCodes,
    confidence_label: claim.confidenceLabel,
    policy_warnings: claim.warnings ?? [],
  }));
}

export function summarizeAiEvidenceCoverage(
  rows: Array<{
    claim_key: string;
    policy_warnings?: string[] | null;
  }>
) {
  const claimCount = rows.length;
  const rowsWithWarnings = rows.filter((row) => (row.policy_warnings ?? []).length > 0).length;

  return {
    claimCount,
    warningCount: rowsWithWarnings,
    coveragePct: claimCount > 0 ? 100 : 0,
  };
}

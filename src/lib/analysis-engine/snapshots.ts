import type { AnalysisAnalyticsRow, AnalysisResultRow, ScoredCampaignOutput } from "./types";

export type AnalysisRunSnapshot = {
  campaignId: string;
  analysisRunId: string;
  logicVersion: string;
  sampleN: number;
  responseRate: number;
  dimensionScores: Array<{
    code: string;
    instrumentType: "base" | "module" | null;
    avgScore: number;
    favorabilityPct: number;
  }>;
  categoryScores: Array<{
    category: string;
    avgScore: number;
    favorabilityPct: number;
  }>;
};

function getDimensionScores(results: AnalysisResultRow[]) {
  return results
    .filter((row) => row.result_type === "dimension" && row.segment_type === "global")
    .map((row) => ({
      code: row.dimension_code ?? "unknown",
      instrumentType: row.instrument_type ?? null,
      avgScore: row.avg_score,
      favorabilityPct: row.favorability_pct,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

function getCategoryScores(analytics: AnalysisAnalyticsRow[]) {
  const categories = analytics.find((row) => row.analysis_type === "categories");
  if (!categories || !Array.isArray(categories.data)) {
    return [] as AnalysisRunSnapshot["categoryScores"];
  }

  return categories.data.map((entry) => {
    const row = entry as {
      category?: string;
      avg_score?: number;
      favorability_pct?: number;
    };

    return {
      category: row.category ?? "unknown",
      avgScore: row.avg_score ?? 0,
      favorabilityPct: row.favorability_pct ?? 0,
    };
  });
}

export function buildAnalysisRunSnapshot(params: {
  campaignId: string;
  analysisRunId: string;
  logicVersion: string;
  output: ScoredCampaignOutput;
}): AnalysisRunSnapshot {
  return {
    campaignId: params.campaignId,
    analysisRunId: params.analysisRunId,
    logicVersion: params.logicVersion,
    sampleN: params.output.sampleN,
    responseRate: params.output.responseRate,
    dimensionScores: getDimensionScores(params.output.results),
    categoryScores: getCategoryScores(params.output.analytics),
  };
}

export type SnapshotComparison = {
  currentAnalysisRunId: string;
  previousAnalysisRunId: string;
  sampleDelta: number;
  responseRateDelta: number;
  dimensionChanges: Array<{
    code: string;
    currentScore: number;
    previousScore: number;
    delta: number;
  }>;
};

export function compareAnalysisSnapshots(
  current: AnalysisRunSnapshot,
  previous: AnalysisRunSnapshot
) {
  const previousByCode = new Map(previous.dimensionScores.map((row) => [row.code, row]));

  return {
    currentAnalysisRunId: current.analysisRunId,
    previousAnalysisRunId: previous.analysisRunId,
    sampleDelta: current.sampleN - previous.sampleN,
    responseRateDelta: Math.round((current.responseRate - previous.responseRate) * 100) / 100,
    dimensionChanges: current.dimensionScores
      .filter((row) => previousByCode.has(row.code))
      .map((row) => {
        const before = previousByCode.get(row.code)!;
        return {
          code: row.code,
          currentScore: row.avgScore,
          previousScore: before.avgScore,
          delta: Math.round((row.avgScore - before.avgScore) * 100) / 100,
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
  };
}

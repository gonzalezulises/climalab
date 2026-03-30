import { mean, stdDev, welchTTest, bootstrapCI, cohensD } from "@/lib/statistics";

type WaveComparisonInput = {
  currentScores: number[];
  previousScores: number[];
  previousCampaignId: string;
};

export type WaveComparisonMetadata = {
  previous_campaign_id: string;
  previous_avg: number;
  current_avg: number;
  delta: number;
  welch: { t: number; df: number; p_value: number; significant: boolean } | null;
  bootstrap: { lower: number; upper: number; mean_diff: number; significant: boolean } | null;
  effect_size: { d: number; label: string };
  method: string;
};

const ROUND = (v: number) => Math.round(v * 1000) / 1000;

export function buildWaveComparisonMetadata(
  input: WaveComparisonInput
): WaveComparisonMetadata | null {
  if (input.previousScores.length === 0 || input.currentScores.length === 0) return null;

  const prevAvg = mean(input.previousScores);
  const currAvg = mean(input.currentScores);
  const welch = welchTTest(input.currentScores, input.previousScores);
  const bootstrap = bootstrapCI(input.currentScores, input.previousScores);
  const effectSize = cohensD(
    currAvg,
    prevAvg,
    stdDev(input.currentScores),
    stdDev(input.previousScores),
    input.currentScores.length,
    input.previousScores.length
  );

  return {
    previous_campaign_id: input.previousCampaignId,
    previous_avg: ROUND(prevAvg),
    current_avg: ROUND(currAvg),
    delta: ROUND(currAvg - prevAvg),
    welch: welch
      ? { t: welch.t, df: welch.df, p_value: welch.pValue, significant: welch.significant }
      : null,
    bootstrap: bootstrap
      ? {
          lower: bootstrap.lower,
          upper: bootstrap.upper,
          mean_diff: bootstrap.meanDiff,
          significant: bootstrap.significant,
        }
      : null,
    effect_size: { d: effectSize.d, label: effectSize.label },
    method: "welch_t",
  };
}

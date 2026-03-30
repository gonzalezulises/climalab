import { describe, it, expect } from "vitest";
import {
  buildWaveComparisonMetadata,
  buildWaveComparisonFromStats,
} from "@/lib/analysis-engine/wave-comparison";

describe("buildWaveComparisonMetadata", () => {
  it("produces wave_comparison when previous scores exist", () => {
    const currentScores = [
      3.8, 4.0, 4.2, 3.9, 4.1, 3.7, 4.0, 3.8, 4.2, 3.9, 4.1, 3.7, 4.0, 3.8, 4.2,
    ];
    const previousScores = [
      3.2, 3.4, 3.6, 3.3, 3.5, 3.1, 3.4, 3.2, 3.6, 3.3, 3.5, 3.1, 3.4, 3.2, 3.6,
    ];
    const result = buildWaveComparisonMetadata({
      currentScores,
      previousScores,
      previousCampaignId: "prev-uuid",
    });
    expect(result).not.toBeNull();
    expect(result!.previous_campaign_id).toBe("prev-uuid");
    expect(result!.delta).toBeGreaterThan(0);
    expect(result!.welch).toBeDefined();
    expect(result!.effect_size).toBeDefined();
    expect(result!.method).toBe("welch_t");
  });

  it("returns null when previous scores are empty", () => {
    const result = buildWaveComparisonMetadata({
      currentScores: [3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2],
      previousScores: [],
      previousCampaignId: "prev-uuid",
    });
    expect(result).toBeNull();
  });

  it("includes bootstrap when n < 30", () => {
    const current = [3.8, 4.0, 4.2, 3.9, 4.1, 3.7, 4.0, 3.8, 4.2, 3.9, 4.1, 3.7, 4.0, 3.8, 4.2];
    const previous = [3.2, 3.4, 3.6, 3.3, 3.5, 3.1, 3.4, 3.2, 3.6, 3.3, 3.5, 3.1, 3.4, 3.2, 3.6];
    const result = buildWaveComparisonMetadata({
      currentScores: current,
      previousScores: previous,
      previousCampaignId: "prev-uuid",
    });
    expect(result).not.toBeNull();
    expect(result!.bootstrap).not.toBeNull();
  });
});

describe("buildWaveComparisonFromStats", () => {
  it("produces comparison from aggregate statistics", () => {
    const result = buildWaveComparisonFromStats({
      currentAvg: 4.0,
      currentStd: 0.5,
      currentN: 30,
      previousAvg: 3.5,
      previousStd: 0.6,
      previousN: 25,
      previousCampaignId: "prev-uuid",
    });
    expect(result).not.toBeNull();
    expect(result!.previous_campaign_id).toBe("prev-uuid");
    expect(result!.delta).toBeGreaterThan(0);
    expect(result!.method).toBe("welch_t_from_stats");
    expect(result!.bootstrap).toBeNull();
    expect(result!.effect_size).toBeDefined();
  });

  it("returns null when currentN is 0", () => {
    const result = buildWaveComparisonFromStats({
      currentAvg: 4.0,
      currentStd: 0.5,
      currentN: 0,
      previousAvg: 3.5,
      previousStd: 0.6,
      previousN: 25,
      previousCampaignId: "prev-uuid",
    });
    expect(result).toBeNull();
  });

  it("returns null welch when n is below threshold", () => {
    const result = buildWaveComparisonFromStats({
      currentAvg: 4.0,
      currentStd: 0.5,
      currentN: 5,
      previousAvg: 3.5,
      previousStd: 0.6,
      previousN: 5,
      previousCampaignId: "prev-uuid",
    });
    expect(result).not.toBeNull();
    expect(result!.welch).toBeNull();
  });
});

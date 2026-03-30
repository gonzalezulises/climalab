import { describe, it, expect } from "vitest";
import { buildWaveComparisonFromStats } from "@/lib/analysis-engine/wave-comparison";

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

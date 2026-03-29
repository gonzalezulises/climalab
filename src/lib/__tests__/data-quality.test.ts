import { describe, expect, it } from "vitest";
import { buildCampaignDataQuality } from "@/lib/data-quality";

describe("buildCampaignDataQuality", () => {
  it("scores a strong campaign as high quality", () => {
    const summary = buildCampaignDataQuality({
      respondentsTotal: 100,
      validRespondents: 90,
      disqualifiedRespondents: 5,
      duplicateIngestEvents: 0,
      failedIngestEvents: 0,
      missingDepartment: 2,
      missingTenure: 1,
      missingGender: 3,
    });

    expect(summary.qualityLabel).toBe("high");
    expect(summary.validRespondentPct).toBe(90);
  });

  it("downgrades campaigns with ingestion failures or low completeness", () => {
    const summary = buildCampaignDataQuality({
      respondentsTotal: 20,
      validRespondents: 8,
      disqualifiedRespondents: 4,
      duplicateIngestEvents: 1,
      failedIngestEvents: 2,
      missingDepartment: 8,
      missingTenure: 9,
      missingGender: 10,
    });

    expect(summary.qualityLabel).toBe("low");
    expect(summary.failedIngestEvents).toBe(2);
  });
});

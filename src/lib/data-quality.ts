export type CampaignDataQualityInput = {
  respondentsTotal: number;
  validRespondents: number;
  disqualifiedRespondents: number;
  duplicateIngestEvents: number;
  failedIngestEvents: number;
  missingDepartment: number;
  missingTenure: number;
  missingGender: number;
};

export type CampaignDataQualitySummary = {
  respondentCoveragePct: number;
  validRespondentPct: number;
  duplicateIngestEvents: number;
  failedIngestEvents: number;
  demographicCompletenessPct: {
    department: number;
    tenure: number;
    gender: number;
  };
  qualityLabel: "high" | "medium" | "low";
};

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function buildCampaignDataQuality(
  input: CampaignDataQualityInput
): CampaignDataQualitySummary {
  const respondentCoveragePct = pct(
    input.validRespondents + input.disqualifiedRespondents,
    input.respondentsTotal
  );
  const validRespondentPct = pct(input.validRespondents, input.respondentsTotal);
  const demographicCompletenessPct = {
    department: pct(input.respondentsTotal - input.missingDepartment, input.respondentsTotal),
    tenure: pct(input.respondentsTotal - input.missingTenure, input.respondentsTotal),
    gender: pct(input.respondentsTotal - input.missingGender, input.respondentsTotal),
  };

  const qualityLabel =
    input.failedIngestEvents > 0 ||
    validRespondentPct < 60 ||
    Object.values(demographicCompletenessPct).some((value) => value < 70)
      ? "low"
      : input.duplicateIngestEvents > 0 || validRespondentPct < 80
        ? "medium"
        : "high";

  return {
    respondentCoveragePct,
    validRespondentPct,
    duplicateIngestEvents: input.duplicateIngestEvents,
    failedIngestEvents: input.failedIngestEvents,
    demographicCompletenessPct,
    qualityLabel,
  };
}

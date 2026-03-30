import { cronbachAlpha, mean, pearson } from "@/lib/statistics";
import type { CampaignDataQualitySummary } from "@/lib/data-quality";

type NullableScore = number | null;

export type InstrumentQualityItemInput = {
  itemId: string;
  itemText: string;
  scores: NullableScore[];
};

export type InstrumentQualityDimensionInput = {
  code: string;
  name: string;
  alpha: number | null;
  alphaStatus: "calculated" | "insufficient_n" | "insufficient_items" | "zero_variance";
  rwg: number | null;
  respondentCount: number;
  itemScores: InstrumentQualityItemInput[];
};

export type InstrumentQualityReportInput = {
  sample: {
    populationN: number | null;
    sampleN: number;
    responseRate: number;
    marginOfError: number | null;
  };
  campaignQuality: CampaignDataQualitySummary;
  dimensions: InstrumentQualityDimensionInput[];
};

export type InstrumentInterpretability =
  | "robusto"
  | "aceptable"
  | "precaucion"
  | "no_interpretable";

export type InstrumentQualityItemDiagnostic = {
  itemId: string;
  itemText: string;
  meanScore: number | null;
  missingnessPct: number;
  correctedItemTotal: number | null;
  alphaIfDeleted: number | null;
  floorPct: number;
  ceilingPct: number;
  flags: string[];
};

export type InstrumentQualityDimensionReport = {
  code: string;
  name: string;
  alpha: number | null;
  alphaStatus: InstrumentQualityDimensionInput["alphaStatus"];
  rwg: number | null;
  respondentCount: number;
  interpretability: InstrumentInterpretability;
  itemDiagnostics: InstrumentQualityItemDiagnostic[];
  weakItems: InstrumentQualityItemDiagnostic[];
};

export type InstrumentQualityReport = {
  overallStatus: InstrumentInterpretability;
  overallScore: number;
  warnings: string[];
  dimensionWarnings: string[];
  dimensions: InstrumentQualityDimensionReport[];
  sample: InstrumentQualityReportInput["sample"];
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return round((numerator / denominator) * 100);
}

function buildCompleteMatrix(items: InstrumentQualityItemInput[]) {
  if (items.length === 0) return [];
  const respondentCount = items[0]?.scores.length ?? 0;
  const matrix: number[][] = [];

  for (let respondentIndex = 0; respondentIndex < respondentCount; respondentIndex++) {
    const row = items.map((item) => item.scores[respondentIndex]);
    if (row.every((value): value is number => typeof value === "number")) {
      matrix.push(row);
    }
  }

  return matrix;
}

function computeCorrectedItemTotal(items: InstrumentQualityItemInput[], itemIndex: number) {
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (
    let respondentIndex = 0;
    respondentIndex < items[itemIndex]!.scores.length;
    respondentIndex++
  ) {
    const itemScore = items[itemIndex]!.scores[respondentIndex];
    if (typeof itemScore !== "number") continue;

    let total = 0;
    let count = 0;
    for (let peerIndex = 0; peerIndex < items.length; peerIndex++) {
      if (peerIndex === itemIndex) continue;
      const peerScore = items[peerIndex]!.scores[respondentIndex];
      if (typeof peerScore === "number") {
        total += peerScore;
        count += 1;
      }
    }

    if (count > 0) {
      xValues.push(itemScore);
      yValues.push(total);
    }
  }

  if (xValues.length < 10) return null;
  return pearson(xValues, yValues).r;
}

function computeAlphaIfDeleted(items: InstrumentQualityItemInput[], itemIndex: number) {
  if (items.length <= 2) return null;
  const reduced = items.filter((_, currentIndex) => currentIndex !== itemIndex);
  const matrix = buildCompleteMatrix(reduced);
  const alpha = cronbachAlpha(matrix);
  return alpha.status === "calculated" ? alpha.value : null;
}

function buildItemDiagnostic(
  items: InstrumentQualityItemInput[],
  item: InstrumentQualityItemInput,
  itemIndex: number
): InstrumentQualityItemDiagnostic {
  const answeredScores = item.scores.filter((score): score is number => typeof score === "number");
  const missingnessPct = pct(item.scores.length - answeredScores.length, item.scores.length);
  const floorPct = pct(answeredScores.filter((score) => score === 1).length, answeredScores.length);
  const ceilingPct = pct(
    answeredScores.filter((score) => score === 5).length,
    answeredScores.length
  );
  const correctedItemTotal = computeCorrectedItemTotal(items, itemIndex);
  const alphaIfDeleted = computeAlphaIfDeleted(items, itemIndex);
  const flags: string[] = [];

  if (missingnessPct >= 15) flags.push("high_missingness");
  if (correctedItemTotal !== null && correctedItemTotal < 0.2) flags.push("low_item_total");
  if (floorPct >= 80) flags.push("floor_effect");
  if (ceilingPct >= 80) flags.push("ceiling_effect");

  return {
    itemId: item.itemId,
    itemText: item.itemText,
    meanScore: answeredScores.length > 0 ? round(mean(answeredScores)) : null,
    missingnessPct,
    correctedItemTotal: correctedItemTotal === null ? null : round(correctedItemTotal),
    alphaIfDeleted: alphaIfDeleted === null ? null : round(alphaIfDeleted),
    floorPct,
    ceilingPct,
    flags,
  };
}

function determineDimensionInterpretability(input: {
  respondentCount: number;
  alpha: number | null;
  alphaStatus: InstrumentQualityDimensionInput["alphaStatus"];
  rwg: number | null;
  weakItemCount: number;
  itemCount: number;
}): InstrumentInterpretability {
  if (input.respondentCount < 10 || input.alphaStatus === "insufficient_n") {
    return "no_interpretable";
  }

  if (
    (input.alpha !== null && input.alpha < 0.6) ||
    (input.rwg !== null && input.rwg < 0.5) ||
    input.weakItemCount >= Math.max(1, Math.ceil(input.itemCount / 2))
  ) {
    return "precaucion";
  }

  if (
    input.alphaStatus !== "calculated" ||
    (input.alpha !== null && input.alpha < 0.7) ||
    (input.rwg !== null && input.rwg < 0.7) ||
    input.weakItemCount > 0
  ) {
    return "aceptable";
  }

  return "robusto";
}

function scoreStatus(status: InstrumentInterpretability) {
  switch (status) {
    case "robusto":
      return 95;
    case "aceptable":
      return 78;
    case "precaucion":
      return 58;
    case "no_interpretable":
      return 25;
  }
}

export function buildInstrumentQualityReport(
  input: InstrumentQualityReportInput
): InstrumentQualityReport {
  const dimensionWarnings = new Set<string>();
  const warnings: string[] = [];

  const dimensions = input.dimensions.map<InstrumentQualityDimensionReport>((dimension) => {
    const itemDiagnostics = dimension.itemScores.map((item, index) =>
      buildItemDiagnostic(dimension.itemScores, item, index)
    );
    const weakItems = itemDiagnostics.filter((item) => item.flags.length > 0);

    if (dimension.alpha !== null && dimension.alpha < 0.7) {
      dimensionWarnings.add("low_alpha_dimensions");
    }
    if (dimension.rwg !== null && dimension.rwg < 0.7) {
      dimensionWarnings.add("low_rwg_dimensions");
    }

    return {
      code: dimension.code,
      name: dimension.name,
      alpha: dimension.alpha,
      alphaStatus: dimension.alphaStatus,
      rwg: dimension.rwg,
      respondentCount: dimension.respondentCount,
      interpretability: determineDimensionInterpretability({
        respondentCount: dimension.respondentCount,
        alpha: dimension.alpha,
        alphaStatus: dimension.alphaStatus,
        rwg: dimension.rwg,
        weakItemCount: weakItems.length,
        itemCount: dimension.itemScores.length,
      }),
      itemDiagnostics,
      weakItems,
    };
  });

  if (input.campaignQuality.validRespondentPct < 60 || input.sample.sampleN < 10) {
    warnings.push("valid_sample_too_low");
  }
  if (input.campaignQuality.failedIngestEvents > 0) {
    warnings.push("failed_ingest_events");
  }
  if (input.campaignQuality.duplicateIngestEvents > 0) {
    warnings.push("duplicate_ingest_events");
  }

  let overallStatus: InstrumentInterpretability;
  if (warnings.includes("valid_sample_too_low")) {
    overallStatus = "no_interpretable";
  } else if (
    input.campaignQuality.qualityLabel === "low" ||
    dimensions.some((dimension) => dimension.interpretability === "no_interpretable") ||
    dimensions.some((dimension) => dimension.interpretability === "precaucion")
  ) {
    overallStatus = "precaucion";
  } else if (
    input.campaignQuality.qualityLabel === "medium" ||
    dimensions.some((dimension) => dimension.interpretability === "aceptable")
  ) {
    overallStatus = "aceptable";
  } else {
    overallStatus = "robusto";
  }

  const overallScore = round(
    dimensions.length > 0
      ? dimensions.reduce((sum, dimension) => sum + scoreStatus(dimension.interpretability), 0) /
          dimensions.length
      : scoreStatus(overallStatus)
  );

  return {
    overallStatus,
    overallScore,
    warnings,
    dimensionWarnings: [...dimensionWarnings],
    dimensions,
    sample: input.sample,
  };
}

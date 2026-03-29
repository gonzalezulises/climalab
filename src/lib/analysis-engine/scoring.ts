import { mean, stdDev, favorability, rwg, cronbachAlpha, pearson } from "@/lib/statistics";
import {
  computeMarginOfError,
  computeResponseRate,
  roundPercentage,
  roundScore,
} from "@/lib/calculations";
import { evaluateRespondentQuality, type QualityEvaluation } from "./quality";
import type {
  AnalysisAnalyticsRow,
  AnalysisDataset,
  AnalysisDimension,
  AnalysisResultRow,
  ScoredCampaignOutput,
} from "./types";

type RespondentScores = {
  department: string | null;
  tenure: string | null;
  gender: string | null;
  dimensionScores: Map<string, number[]>;
  allScores: number[];
};

function resolveAnalyticsCategory(dimension: AnalysisDimension) {
  return (
    dimension.analyticsCategory ??
    dimension.category ??
    (dimension.instrumentType === "module" ? "modulos" : null)
  );
}

function buildDimensionMaps(dimensions: AnalysisDimension[]) {
  const dimensionByCode = new Map<string, AnalysisDimension>();
  const itemTextById = new Map<string, string>();

  for (const dimension of dimensions) {
    dimensionByCode.set(dimension.code, dimension);
    for (const item of dimension.items) {
      if (!item.isAttentionCheck) {
        itemTextById.set(item.id, item.text);
      }
    }
  }

  return { dimensionByCode, itemTextById };
}

function buildRespondentData(dataset: AnalysisDataset, quality: QualityEvaluation) {
  const respondentData = new Map<string, RespondentScores>();

  for (const respondent of dataset.respondents) {
    if (!quality.validRespondentIds.has(respondent.id)) {
      continue;
    }

    const responses = quality.respondentResponses.get(respondent.id);
    if (!responses) {
      continue;
    }

    const data: RespondentScores = {
      department: respondent.department,
      tenure: respondent.tenure,
      gender: respondent.gender,
      dimensionScores: new Map(),
      allScores: [],
    };

    for (const [itemId, score] of responses) {
      const itemInfo = quality.itemInfoById.get(itemId);
      if (!itemInfo || itemInfo.item.isAttentionCheck) {
        continue;
      }

      const adjustedScore = itemInfo.item.isReverse ? 6 - score : score;
      if (!data.dimensionScores.has(itemInfo.dimension.code)) {
        data.dimensionScores.set(itemInfo.dimension.code, []);
      }
      data.dimensionScores.get(itemInfo.dimension.code)!.push(adjustedScore);
      data.allScores.push(adjustedScore);
    }

    respondentData.set(respondent.id, data);
  }

  return respondentData;
}

function createDimensionResult(
  dataset: AnalysisDataset,
  dimension: AnalysisDimension,
  segmentKey: string,
  segmentType: string,
  scores: number[],
  respondentCount: number,
  perRespondentMeans: number[]
): AnalysisResultRow {
  return {
    campaign_id: dataset.campaignId,
    result_type: "dimension",
    instrument_id: dimension.instrumentId,
    instrument_type: dimension.instrumentType,
    dimension_id: dimension.id,
    dimension_code: dimension.code,
    segment_key: segmentKey,
    segment_type: segmentType,
    avg_score: roundScore(mean(scores)),
    std_score: roundScore(stdDev(scores)),
    favorability_pct: roundPercentage(favorability(scores)),
    response_count: scores.length,
    respondent_count: respondentCount,
    metadata: {
      dimension_name: dimension.name,
      rwg: rwg(perRespondentMeans),
      analytics_category: resolveAnalyticsCategory(dimension),
    },
  };
}

function buildDimensionResults(
  dataset: AnalysisDataset,
  respondentData: Map<string, RespondentScores>,
  dimensions: AnalysisDimension[]
) {
  const results: AnalysisResultRow[] = [];
  const dimensionsWithScores = dimensions.filter((dimension) =>
    dimension.items.some((item) => !item.isAttentionCheck)
  );

  for (const dimension of dimensionsWithScores) {
    const globalScores: number[] = [];
    const globalMeans: number[] = [];
    let respondentCount = 0;

    for (const respondent of respondentData.values()) {
      const scores = respondent.dimensionScores.get(dimension.code);
      if (!scores || scores.length === 0) {
        continue;
      }
      globalScores.push(...scores);
      globalMeans.push(mean(scores));
      respondentCount++;
    }

    if (globalScores.length > 0) {
      results.push(
        createDimensionResult(
          dataset,
          dimension,
          "global",
          "global",
          globalScores,
          respondentCount,
          globalMeans
        )
      );
    }
  }

  for (const segmentType of ["department", "tenure", "gender"] as const) {
    const segmentScores = new Map<string, Map<string, number[]>>();
    const segmentRespondents = new Map<string, Map<string, number>>();
    const segmentMeans = new Map<string, Map<string, number[]>>();

    for (const respondent of respondentData.values()) {
      const segmentValue = respondent[segmentType];
      if (!segmentValue) {
        continue;
      }

      for (const dimension of dimensionsWithScores) {
        const scores = respondent.dimensionScores.get(dimension.code);
        if (!scores || scores.length === 0) {
          continue;
        }

        if (!segmentScores.has(segmentValue)) {
          segmentScores.set(segmentValue, new Map());
          segmentRespondents.set(segmentValue, new Map());
          segmentMeans.set(segmentValue, new Map());
        }

        const scoreMap = segmentScores.get(segmentValue)!;
        const respondentMap = segmentRespondents.get(segmentValue)!;
        const meanMap = segmentMeans.get(segmentValue)!;

        if (!scoreMap.has(dimension.code)) {
          scoreMap.set(dimension.code, []);
          respondentMap.set(dimension.code, 0);
          meanMap.set(dimension.code, []);
        }

        scoreMap.get(dimension.code)!.push(...scores);
        respondentMap.set(dimension.code, (respondentMap.get(dimension.code) ?? 0) + 1);
        meanMap.get(dimension.code)!.push(mean(scores));
      }
    }

    for (const [segmentValue, scoreMap] of segmentScores) {
      for (const dimension of dimensionsWithScores) {
        const scores = scoreMap.get(dimension.code);
        if (!scores || scores.length === 0) {
          continue;
        }
        const respondentCount = segmentRespondents.get(segmentValue)?.get(dimension.code) ?? 0;
        if (respondentCount < 5) {
          continue;
        }

        results.push(
          createDimensionResult(
            dataset,
            dimension,
            segmentValue,
            segmentType,
            scores,
            respondentCount,
            segmentMeans.get(segmentValue)?.get(dimension.code) ?? []
          )
        );
      }
    }
  }

  return results;
}

function buildItemResults(
  dataset: AnalysisDataset,
  dimensions: AnalysisDimension[],
  respondentData: Map<string, RespondentScores>,
  quality: QualityEvaluation
) {
  const { itemTextById } = buildDimensionMaps(dimensions);
  const itemScores = new Map<string, { scores: number[]; respondentCount: number }>();

  for (const respondentId of respondentData.keys()) {
    const responses = quality.respondentResponses.get(respondentId);
    if (!responses) {
      continue;
    }

    for (const [itemId, rawScore] of responses) {
      const itemInfo = quality.itemInfoById.get(itemId);
      if (!itemInfo || itemInfo.item.isAttentionCheck) {
        continue;
      }

      const adjustedScore = itemInfo.item.isReverse ? 6 - rawScore : rawScore;
      if (!itemScores.has(itemId)) {
        itemScores.set(itemId, { scores: [], respondentCount: 0 });
      }
      const entry = itemScores.get(itemId)!;
      entry.scores.push(adjustedScore);
      entry.respondentCount++;
    }
  }

  const results: AnalysisResultRow[] = [];
  for (const [itemId, entry] of itemScores) {
    const itemInfo = quality.itemInfoById.get(itemId);
    if (!itemInfo) {
      continue;
    }

    results.push({
      campaign_id: dataset.campaignId,
      result_type: "item",
      instrument_id: itemInfo.dimension.instrumentId,
      instrument_type: itemInfo.dimension.instrumentType,
      dimension_id: itemInfo.dimension.id,
      dimension_code: itemInfo.dimension.code,
      segment_key: itemId,
      segment_type: "global",
      avg_score: roundScore(mean(entry.scores)),
      std_score: roundScore(stdDev(entry.scores)),
      favorability_pct: roundPercentage(favorability(entry.scores)),
      response_count: entry.scores.length,
      respondent_count: entry.respondentCount,
      metadata: {
        item_text: itemTextById.get(itemId) ?? itemInfo.item.text,
        dimension_name: itemInfo.dimension.name,
        analytics_category: resolveAnalyticsCategory(itemInfo.dimension),
      },
    });
  }

  return results;
}

function buildEngagementResults(
  dataset: AnalysisDataset,
  respondentData: Map<string, RespondentScores>
) {
  const engagementScores: number[] = [];
  const profiles = { ambassadors: 0, committed: 0, neutral: 0, disengaged: 0 };

  for (const respondent of respondentData.values()) {
    if (respondent.allScores.length === 0) {
      continue;
    }
    const avgScore = mean(respondent.allScores);
    engagementScores.push(avgScore);

    if (avgScore >= 4.5) {
      profiles.ambassadors++;
    } else if (avgScore >= 4.0) {
      profiles.committed++;
    } else if (avgScore >= 3.0) {
      profiles.neutral++;
    } else {
      profiles.disengaged++;
    }
  }

  if (engagementScores.length === 0) {
    return [] as AnalysisResultRow[];
  }

  const total = engagementScores.length;
  return [
    {
      campaign_id: dataset.campaignId,
      result_type: "engagement",
      instrument_id: null,
      instrument_type: null,
      dimension_id: null,
      dimension_code: null,
      segment_key: "global",
      segment_type: "global",
      avg_score: roundScore(mean(engagementScores)),
      std_score: roundScore(stdDev(engagementScores)),
      favorability_pct: roundPercentage(
        favorability(engagementScores.map((score) => Math.round(score)))
      ),
      response_count: total,
      respondent_count: total,
      metadata: {
        profiles: {
          ambassadors: {
            count: profiles.ambassadors,
            pct: roundPercentage((profiles.ambassadors / total) * 100),
          },
          committed: {
            count: profiles.committed,
            pct: roundPercentage((profiles.committed / total) * 100),
          },
          neutral: {
            count: profiles.neutral,
            pct: roundPercentage((profiles.neutral / total) * 100),
          },
          disengaged: {
            count: profiles.disengaged,
            pct: roundPercentage((profiles.disengaged / total) * 100),
          },
        },
      },
    },
  ];
}

function buildEnpsResults(dataset: AnalysisDataset, respondentData: Map<string, RespondentScores>) {
  const enpsScores = dataset.respondents
    .filter((respondent) => respondentData.has(respondent.id) && respondent.enpsScore !== null)
    .map((respondent) => respondent.enpsScore as number);

  if (enpsScores.length === 0) {
    return [] as AnalysisResultRow[];
  }

  const promoters = enpsScores.filter((score) => score >= 9).length;
  const detractors = enpsScores.filter((score) => score <= 6).length;
  const total = enpsScores.length;

  return [
    {
      campaign_id: dataset.campaignId,
      result_type: "enps",
      instrument_id: null,
      instrument_type: null,
      dimension_id: null,
      dimension_code: null,
      segment_key: "global",
      segment_type: "global",
      avg_score: Math.round(((promoters - detractors) / total) * 100),
      std_score: 0,
      favorability_pct: roundPercentage((promoters / total) * 100),
      response_count: total,
      respondent_count: total,
      metadata: {
        promoters: { count: promoters, pct: roundPercentage((promoters / total) * 100) },
        passives: {
          count: total - promoters - detractors,
          pct: roundPercentage(((total - promoters - detractors) / total) * 100),
        },
        detractors: { count: detractors, pct: roundPercentage((detractors / total) * 100) },
      },
    },
  ];
}

function buildCorrelationMatrix(
  dimensions: AnalysisDimension[],
  respondentData: Map<string, RespondentScores>
) {
  const dimensionCodes = dimensions
    .filter((dimension) => dimension.items.some((item) => !item.isAttentionCheck))
    .map((dimension) => dimension.code);
  const respondentDimensionAverages = new Map<string, Map<string, number>>();

  for (const [respondentId, respondent] of respondentData) {
    const averages = new Map<string, number>();
    for (const [code, scores] of respondent.dimensionScores) {
      if (scores.length > 0) {
        averages.set(code, mean(scores));
      }
    }
    respondentDimensionAverages.set(respondentId, averages);
  }

  const correlationMatrix: Record<
    string,
    Record<string, { r: number; pValue: number; n: number }>
  > = {};
  for (const codeA of dimensionCodes) {
    correlationMatrix[codeA] = {};
    for (const codeB of dimensionCodes) {
      if (codeA === codeB) {
        correlationMatrix[codeA][codeB] = { r: 1, pValue: 0, n: respondentData.size };
        continue;
      }
      const xArr: number[] = [];
      const yArr: number[] = [];
      for (const averages of respondentDimensionAverages.values()) {
        const x = averages.get(codeA);
        const y = averages.get(codeB);
        if (x !== undefined && y !== undefined) {
          xArr.push(x);
          yArr.push(y);
        }
      }
      correlationMatrix[codeA][codeB] = pearson(xArr, yArr);
    }
  }

  return correlationMatrix;
}

function buildAnalytics(
  dataset: AnalysisDataset,
  dimensions: AnalysisDimension[],
  results: AnalysisResultRow[],
  respondentData: Map<string, RespondentScores>,
  quality: QualityEvaluation
) {
  const analytics: AnalysisAnalyticsRow[] = [];
  const { itemTextById } = buildDimensionMaps(dimensions);
  const correlationMatrix = buildCorrelationMatrix(dimensions, respondentData);

  analytics.push({
    campaign_id: dataset.campaignId,
    analysis_type: "correlation_matrix",
    data: correlationMatrix,
  });

  const engagementDrivers = dimensions
    .filter((dimension) => dimension.code !== "ENG" && correlationMatrix[dimension.code]?.ENG)
    .map((dimension) => ({
      code: dimension.code,
      name: dimension.name,
      ...correlationMatrix[dimension.code].ENG,
    }))
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  analytics.push({
    campaign_id: dataset.campaignId,
    analysis_type: "engagement_drivers",
    data: engagementDrivers,
  });

  const alerts: Array<{
    severity: string;
    type: string;
    dimension_code?: string;
    item_id?: string;
    item_text?: string;
    segment_key?: string;
    value: number;
    threshold: number;
    message: string;
  }> = [];

  for (const responseResult of results) {
    if (responseResult.result_type === "item" && responseResult.favorability_pct < 70) {
      const severity = responseResult.favorability_pct < 60 ? "crisis" : "attention";
      const dimension = dimensions.find((entry) => entry.code === responseResult.dimension_code);
      alerts.push({
        severity,
        type: "low_favorability",
        dimension_code: responseResult.dimension_code ?? undefined,
        item_id: responseResult.segment_key,
        item_text: itemTextById.get(responseResult.segment_key) ?? undefined,
        value: responseResult.favorability_pct,
        threshold: severity === "crisis" ? 60 : 70,
        message: `Ítem ${severity === "crisis" ? "con favorabilidad crítica" : "requiere atención"} (${Math.round(responseResult.favorability_pct)}%) en ${dimension?.name ?? responseResult.dimension_code ?? "desconocido"}`,
      });
    }

    if (
      responseResult.result_type === "dimension" &&
      responseResult.dimension_code === "ENG" &&
      responseResult.segment_type !== "global" &&
      responseResult.avg_score < 3.5
    ) {
      alerts.push({
        severity: "risk_group",
        type: "low_engagement_segment",
        segment_key: responseResult.segment_key,
        dimension_code: "ENG",
        value: responseResult.avg_score,
        threshold: 3.5,
        message: `Segmento "${responseResult.segment_key}" con engagement bajo (${responseResult.avg_score})`,
      });
    }
  }

  alerts.sort((a, b) => {
    const order = { crisis: 0, risk_group: 1, decline: 2, attention: 3 };
    return (
      (order[a.severity as keyof typeof order] ?? 4) -
      (order[b.severity as keyof typeof order] ?? 4)
    );
  });

  analytics.push({
    campaign_id: dataset.campaignId,
    analysis_type: "alerts",
    data: alerts,
  });

  const categoryScores = new Map<string, number[]>();
  const categoryDimensionCounts = new Map<string, Set<string>>();

  for (const dimension of dimensions) {
    const analyticsCategory = resolveAnalyticsCategory(dimension);
    if (!analyticsCategory) {
      continue;
    }

    if (!categoryScores.has(analyticsCategory)) {
      categoryScores.set(analyticsCategory, []);
      categoryDimensionCounts.set(analyticsCategory, new Set());
    }

    for (const respondent of respondentData.values()) {
      const scores = respondent.dimensionScores.get(dimension.code);
      if (scores) {
        categoryScores.get(analyticsCategory)!.push(...scores);
      }
    }
    categoryDimensionCounts.get(analyticsCategory)!.add(dimension.code);
  }

  analytics.push({
    campaign_id: dataset.campaignId,
    analysis_type: "categories",
    data: [...categoryScores.entries()]
      .filter(([, scores]) => scores.length > 0)
      .map(([category, scores]) => ({
        category,
        avg_score: roundScore(mean(scores)),
        favorability_pct: roundPercentage(favorability(scores)),
        dimension_count: categoryDimensionCounts.get(category)?.size ?? 0,
      })),
  });

  const reliability = dimensions
    .map((dimension) => {
      const dimensionItems = dimension.items.filter((item) => !item.isAttentionCheck);
      if (dimensionItems.length < 2) {
        return null;
      }

      const matrix: number[][] = [];
      for (const respondentId of respondentData.keys()) {
        const responses = quality.respondentResponses.get(respondentId);
        if (!responses) {
          continue;
        }
        const row: number[] = [];
        let complete = true;
        for (const item of dimensionItems) {
          const rawScore = responses.get(item.id);
          if (rawScore === undefined) {
            complete = false;
            break;
          }
          row.push(item.isReverse ? 6 - rawScore : rawScore);
        }
        if (complete) {
          matrix.push(row);
        }
      }

      const alphaResult = cronbachAlpha(matrix);
      return {
        dimension_code: dimension.code,
        dimension_name: dimension.name,
        alpha: alphaResult.value,
        alphaStatus: alphaResult.status,
        item_count: dimensionItems.length,
        respondent_count: matrix.length,
      };
    })
    .filter(Boolean);

  analytics.push({
    campaign_id: dataset.campaignId,
    analysis_type: "reliability",
    data: reliability,
  });

  return analytics;
}

export function scoreCampaignDataset(dataset: AnalysisDataset): ScoredCampaignOutput {
  const quality = evaluateRespondentQuality(dataset);
  if (quality.validRespondentIds.size === 0) {
    throw new Error(
      "Todos los respondentes fueron descalificados por fallar las verificaciones de atención"
    );
  }

  const respondentData = buildRespondentData(dataset, quality);
  const results = [
    ...buildDimensionResults(dataset, respondentData, dataset.dimensions),
    ...buildItemResults(dataset, dataset.dimensions, respondentData, quality),
    ...buildEngagementResults(dataset, respondentData),
    ...buildEnpsResults(dataset, respondentData),
  ];
  const analytics = buildAnalytics(dataset, dataset.dimensions, results, respondentData, quality);

  const sampleN = quality.validRespondentIds.size;
  const populationN = dataset.targetPopulation;

  return {
    populationN,
    sampleN,
    responseRate: computeResponseRate(sampleN, populationN),
    marginOfError: computeMarginOfError(sampleN, populationN),
    validRespondentIds: [...quality.validRespondentIds],
    respondentQuality: quality.respondentQuality,
    results,
    analytics,
  };
}

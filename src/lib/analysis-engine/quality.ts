import type {
  AnalysisDataset,
  AnalysisDimension,
  AnalysisItem,
  RespondentQualityRecord,
} from "./types";

type ItemInfo = {
  dimension: AnalysisDimension;
  item: AnalysisItem;
  expectedAttentionScore: number | null;
};

export type QualityEvaluation = {
  validRespondentIds: Set<string>;
  respondentResponses: Map<string, Map<string, number>>;
  itemInfoById: Map<string, ItemInfo>;
  respondentQuality: RespondentQualityRecord[];
};

export function inferExpectedAttentionScore(itemText: string) {
  const text = itemText.toLowerCase();
  if (text.includes("de acuerdo") && !text.includes("en desacuerdo")) {
    return 4;
  }
  if (text.includes("en desacuerdo")) {
    return 2;
  }
  return null;
}

export function evaluateRespondentQuality(dataset: AnalysisDataset): QualityEvaluation {
  const itemInfoById = new Map<string, ItemInfo>();

  for (const dimension of dataset.dimensions) {
    for (const item of dimension.items) {
      itemInfoById.set(item.id, {
        dimension,
        item,
        expectedAttentionScore: item.isAttentionCheck
          ? inferExpectedAttentionScore(item.text)
          : null,
      });
    }
  }

  const respondentResponses = new Map<string, Map<string, number>>();
  for (const response of dataset.responses) {
    if (!respondentResponses.has(response.respondentId)) {
      respondentResponses.set(response.respondentId, new Map());
    }
    respondentResponses.get(response.respondentId)!.set(response.itemId, response.score);
  }

  const validRespondentIds = new Set<string>();
  const respondentQuality: RespondentQualityRecord[] = [];

  for (const respondent of dataset.respondents) {
    const responses = respondentResponses.get(respondent.id);
    if (!responses || responses.size === 0) {
      continue;
    }

    let passedAllAttentionChecks = true;

    for (const { item, expectedAttentionScore } of itemInfoById.values()) {
      if (!item.isAttentionCheck || expectedAttentionScore === null) {
        continue;
      }

      if (responses.get(item.id) !== expectedAttentionScore) {
        passedAllAttentionChecks = false;
        break;
      }
    }

    respondentQuality.push({
      respondentId: respondent.id,
      status: passedAllAttentionChecks ? "valid" : "disqualified",
      reason: passedAllAttentionChecks ? null : "attention_check_failed",
    });

    if (passedAllAttentionChecks) {
      validRespondentIds.add(respondent.id);
    }
  }

  return {
    validRespondentIds,
    respondentResponses,
    itemInfoById,
    respondentQuality,
  };
}

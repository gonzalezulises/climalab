import { loadBackup } from "@/app/survey/[token]/survey-backup";
import type { SurveyDimension, SurveyStep } from "@/app/survey/[token]/survey-types";

export function shuffleArray<T>(items: T[], seed: string): T[] {
  const result = [...items];
  let hash = 0;

  for (let seedIndex = 0; seedIndex < seed.length; seedIndex++) {
    hash = (hash << 5) - hash + seed.charCodeAt(seedIndex);
    hash |= 0;
  }

  for (let itemIndex = result.length - 1; itemIndex > 0; itemIndex--) {
    hash = (hash * 16807 + 11) % 2147483647;
    const randomIndex = Math.abs(hash) % (itemIndex + 1);
    [result[itemIndex], result[randomIndex]] = [result[randomIndex], result[itemIndex]];
  }

  return result;
}

export function buildInitialScores(
  token: string,
  existingResponses: { item_id: string; score: number }[]
) {
  const scores: Record<string, number> = {};
  const backup = loadBackup(token);

  if (backup?.scores) {
    Object.assign(scores, backup.scores);
  }

  for (const response of existingResponses) {
    scores[response.item_id] = response.score;
  }

  return scores;
}

export function resolveResumeStep(params: {
  respondentStatus: string;
  respondentDemographics: {
    department: string | null;
    tenure: string | null;
  };
  existingResponses: { item_id: string }[];
  shuffledDimensions: SurveyDimension[];
}): SurveyStep {
  if (params.respondentStatus !== "in_progress" || params.existingResponses.length === 0) {
    return params.respondentStatus === "in_progress" ? "demographics" : "welcome";
  }

  const answeredSet = new Set(params.existingResponses.map((response) => response.item_id));
  let resumeStep: SurveyStep = "demographics";

  if (params.respondentDemographics.department || params.respondentDemographics.tenure) {
    for (let index = 0; index < params.shuffledDimensions.length; index++) {
      const allAnswered = params.shuffledDimensions[index].items.every((item) =>
        answeredSet.has(item.id)
      );

      if (!allAnswered) {
        resumeStep = `dimension-${index}`;
        break;
      }

      if (index === params.shuffledDimensions.length - 1 && allAnswered) {
        resumeStep = "open";
      }
    }
  }

  return resumeStep;
}

export function isDimensionComplete(
  dimensions: SurveyDimension[],
  dimensionIndex: number,
  scores: Record<string, number>
) {
  return dimensions[dimensionIndex].items.every((item) => scores[item.id] !== undefined);
}

import { faker } from "@faker-js/faker/locale/es";

/**
 * Generates Likert 1-5 scores for a respondent given dimension targets.
 * Also generates attention check responses and eNPS.
 */

export interface ItemInfo {
  id: string;
  dimension_code: string;
  is_reverse: boolean;
  is_attention_check: boolean;
  expected_score?: number; // For attention checks
}

export interface GeneratedResponse {
  item_id: string;
  score: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

export function generateResponses(
  items: ItemInfo[],
  dimTargets: Record<string, number>,
  opts: { shouldFailAttention: boolean }
): GeneratedResponse[] {
  const personality = (faker.number.float({ min: 0, max: 1 }) - 0.5) * 0.8;
  const responses: GeneratedResponse[] = [];

  for (const item of items) {
    if (item.is_attention_check) {
      // Fail: give wrong answer. Pass: give correct answer.
      const expected = item.expected_score ?? 4;
      const score = opts.shouldFailAttention ? (expected === 4 ? 2 : 4) : expected;
      responses.push({ item_id: item.id, score });
      continue;
    }

    const dimTarget = dimTargets[item.dimension_code] ?? 3.5;
    const targetForItem = item.is_reverse ? 6 - dimTarget : dimTarget;
    const noise = (faker.number.float({ min: 0, max: 1 }) - 0.5) * 2.0;
    const score = clamp(targetForItem + personality + noise, 1, 5);
    responses.push({ item_id: item.id, score });
  }

  return responses;
}

export function generateENPS(): number {
  const r = faker.number.float({ min: 0, max: 1 });
  if (r < 0.25) return 9 + Math.floor(faker.number.float({ min: 0, max: 1 }) * 2); // 9-10
  if (r < 0.7) return 7 + Math.floor(faker.number.float({ min: 0, max: 1 }) * 2); // 7-8
  return Math.floor(faker.number.float({ min: 0, max: 1 }) * 7); // 0-6
}

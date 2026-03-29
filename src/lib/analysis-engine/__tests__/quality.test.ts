import { describe, expect, it } from "vitest";
import { evaluateRespondentQuality } from "../quality";
import type { AnalysisDataset } from "../types";

const dataset: AnalysisDataset = {
  campaignId: "c0000000-0000-0000-0000-000000000001",
  targetPopulation: 10,
  campaignInstruments: [{ instrumentId: "i-base", instrumentType: "base", sortOrder: 0 }],
  dimensions: [
    {
      id: "d-org",
      instrumentId: "i-base",
      instrumentType: "base",
      code: "ORG",
      name: "Organización",
      category: "bienestar",
      analyticsCategory: "bienestar",
      items: [
        {
          id: "item-org-1",
          text: "Tengo apoyo para hacer bien mi trabajo",
          isReverse: false,
          isAttentionCheck: false,
        },
        {
          id: "item-attn",
          text: "Para verificar su atención, marque De acuerdo",
          isReverse: false,
          isAttentionCheck: true,
        },
      ],
    },
  ],
  respondents: [
    {
      id: "r-valid",
      department: "Ops",
      tenure: "1-3",
      gender: "M",
      enpsScore: 9,
    },
    {
      id: "r-invalid",
      department: "Ops",
      tenure: "1-3",
      gender: "F",
      enpsScore: 6,
    },
  ],
  responses: [
    { respondentId: "r-valid", itemId: "item-org-1", score: 4 },
    { respondentId: "r-valid", itemId: "item-attn", score: 4 },
    { respondentId: "r-invalid", itemId: "item-org-1", score: 5 },
    { respondentId: "r-invalid", itemId: "item-attn", score: 1 },
  ],
};

describe("evaluateRespondentQuality", () => {
  it("keeps respondents that pass attention checks", () => {
    const result = evaluateRespondentQuality(dataset);
    expect(result.validRespondentIds.has("r-valid")).toBe(true);
  });

  it("disqualifies respondents that fail attention checks", () => {
    const result = evaluateRespondentQuality(dataset);
    const disqualified = result.respondentQuality.find(
      (entry) => entry.respondentId === "r-invalid"
    );
    expect(disqualified).toEqual({
      respondentId: "r-invalid",
      status: "disqualified",
      reason: "attention_check_failed",
    });
    expect(result.validRespondentIds.has("r-invalid")).toBe(false);
  });
});

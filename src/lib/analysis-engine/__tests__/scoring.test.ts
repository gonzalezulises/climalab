import { describe, expect, it } from "vitest";
import { scoreCampaignDataset } from "../scoring";
import type { AnalysisDataset } from "../types";

const respondents = [
  { id: "r1", department: "Ops", tenure: "1-3", gender: "M", enpsScore: 9 },
  { id: "r2", department: "Ops", tenure: "1-3", gender: "F", enpsScore: 9 },
  { id: "r3", department: "Ops", tenure: "1-3", gender: "M", enpsScore: 8 },
  { id: "r4", department: "Ops", tenure: "1-3", gender: "F", enpsScore: 8 },
  { id: "r5", department: "Ops", tenure: "1-3", gender: "M", enpsScore: 7 },
  { id: "r6", department: "Ops", tenure: "1-3", gender: "F", enpsScore: 6 },
];

const dataset: AnalysisDataset = {
  campaignId: "c0000000-0000-0000-0000-000000000010",
  targetPopulation: 40,
  campaignInstruments: [
    { instrumentId: "i-core", instrumentType: "base", sortOrder: 0 },
    { instrumentId: "i-cam", instrumentType: "module", sortOrder: 1 },
  ],
  dimensions: [
    {
      id: "d-org",
      instrumentId: "i-core",
      instrumentType: "base",
      code: "ORG",
      name: "Organización",
      category: "bienestar",
      analyticsCategory: "bienestar",
      items: [
        { id: "org-1", text: "Estoy a gusto", isReverse: false, isAttentionCheck: false },
        { id: "org-2", text: "Me siento agotado", isReverse: true, isAttentionCheck: false },
        {
          id: "attn-1",
          text: "Para verificar su atención, marque De acuerdo",
          isReverse: false,
          isAttentionCheck: true,
        },
      ],
    },
    {
      id: "d-eng",
      instrumentId: "i-core",
      instrumentType: "base",
      code: "ENG",
      name: "Engagement",
      category: "engagement",
      analyticsCategory: "engagement",
      items: [
        { id: "eng-1", text: "Recomendaría la empresa", isReverse: false, isAttentionCheck: false },
        { id: "eng-2", text: "Quiero seguir aquí", isReverse: false, isAttentionCheck: false },
      ],
    },
    {
      id: "d-cam",
      instrumentId: "i-cam",
      instrumentType: "module",
      code: "CAM",
      name: "Cambio",
      category: null,
      analyticsCategory: "modulos",
      items: [
        { id: "cam-1", text: "Acepto cambios", isReverse: false, isAttentionCheck: false },
        { id: "cam-2", text: "Aprendo nuevas formas", isReverse: false, isAttentionCheck: false },
      ],
    },
  ],
  respondents,
  responses: respondents.flatMap((respondent, index) => [
    { respondentId: respondent.id, itemId: "org-1", score: 4 },
    { respondentId: respondent.id, itemId: "org-2", score: 2 },
    { respondentId: respondent.id, itemId: "eng-1", score: 4 },
    { respondentId: respondent.id, itemId: "eng-2", score: 4 },
    { respondentId: respondent.id, itemId: "cam-1", score: 5 },
    { respondentId: respondent.id, itemId: "cam-2", score: 4 },
    { respondentId: respondent.id, itemId: "attn-1", score: index === 5 ? 1 : 4 },
  ]),
};

describe("scoreCampaignDataset", () => {
  it("keeps explicit lineage on dimension results", () => {
    const output = scoreCampaignDataset(dataset);
    const orgRow = output.results.find(
      (row) =>
        row.result_type === "dimension" &&
        row.dimension_code === "ORG" &&
        row.segment_type === "global"
    );

    expect(orgRow).toMatchObject({
      instrument_id: "i-core",
      instrument_type: "base",
      dimension_id: "d-org",
    });
  });

  it("respects reverse scoring and attention check filtering", () => {
    const output = scoreCampaignDataset(dataset);
    const orgRow = output.results.find(
      (row) =>
        row.result_type === "dimension" &&
        row.dimension_code === "ORG" &&
        row.segment_type === "global"
    );

    expect(output.sampleN).toBe(5);
    expect(orgRow?.avg_score).toBe(4);
  });

  it("builds module category analytics from persisted taxonomy", () => {
    const output = scoreCampaignDataset(dataset);
    const categories = output.analytics.find((row) => row.analysis_type === "categories")
      ?.data as Array<{
      category: string;
      avg_score: number;
      dimension_count: number;
    }>;

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "modulos",
          avg_score: 4.5,
          dimension_count: 1,
        }),
      ])
    );
  });
});

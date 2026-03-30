import { describe, expect, it } from "vitest";
import { loadCampaignAnalysisDataset } from "../extract";

const campaignId = "450e4a92-dbe9-48ec-a854-49985ed2da86";

function buildReader() {
  const respondents = Array.from({ length: 10 }, (_, respondentIndex) => ({
    id: `respondent-${String(respondentIndex + 1).padStart(2, "0")}`,
    department: "Operaciones",
    tenure: "1-3",
    gender: "Femenino",
    enps_score: 9,
  }));

  const responses = respondents.flatMap((respondent) =>
    Array.from({ length: 125 }, (_, itemIndex) => ({
      respondent_id: respondent.id,
      item_id: `item-${String(itemIndex + 1).padStart(3, "0")}`,
      score: 4,
      answered_at: null,
    }))
  );

  const rangeCalls: Array<{ from: number; to: number }> = [];

  const reader = {
    from(table: string) {
      return {
        select() {
          if (table === "campaigns") {
            return {
              eq() {
                return {
                  single: async () => ({
                    data: {
                      id: campaignId,
                      instrument_id: "instrument-base",
                      module_instrument_ids: [],
                      target_population: 75,
                      organizations: { employee_count: 75 },
                      campaign_instruments: [
                        {
                          instrument_id: "instrument-base",
                          instrument_type: "base" as const,
                          sort_order: 0,
                        },
                      ],
                    },
                    error: null,
                  }),
                };
              },
            };
          }

          if (table === "dimensions") {
            return {
              in() {
                return {
                  order: async () => ({
                    data: [
                      {
                        id: "dimension-org",
                        instrument_id: "instrument-base",
                        code: "ORG",
                        name: "Organización",
                        category: "cultura",
                        dimension_taxonomy: [{ analytics_category: "cultura" }],
                        items: Array.from({ length: 125 }, (_, itemIndex) => ({
                          id: `item-${String(itemIndex + 1).padStart(3, "0")}`,
                          text: `Item ${itemIndex + 1}`,
                          is_reverse: false,
                          is_attention_check: false,
                        })),
                      },
                    ],
                    error: null,
                  }),
                };
              },
            };
          }

          if (table === "respondents") {
            return {
              eq() {
                return {
                  eq: async () => ({
                    data: respondents,
                    error: null,
                  }),
                };
              },
            };
          }

          if (table === "responses") {
            return {
              in() {
                return {
                  order() {
                    return {
                      order() {
                        return {
                          range: async (from: number, to: number) => {
                            rangeCalls.push({ from, to });
                            return {
                              data: responses.slice(from, to + 1),
                              error: null,
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          }

          throw new Error(`Unexpected table ${table}`);
        },
      };
    },
  };

  return { reader, rangeCalls, respondents, responses };
}

describe("loadCampaignAnalysisDataset", () => {
  it("loads every response page for large campaigns", async () => {
    const { reader, rangeCalls, respondents, responses } = buildReader();

    const dataset = await loadCampaignAnalysisDataset(reader as never, campaignId);

    expect(dataset.respondents).toHaveLength(respondents.length);
    expect(dataset.responses).toHaveLength(responses.length);
    expect(rangeCalls).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
    ]);
  });
});

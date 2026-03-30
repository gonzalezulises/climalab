import { describe, expect, it } from "vitest";
import { loadPagedResponsesByRespondentIds } from "@/lib/supabase/paged-responses";

function buildReader(totalResponses: number) {
  const responses = Array.from({ length: totalResponses }, (_, index) => ({
    respondent_id: `respondent-${String(Math.floor(index / 125) + 1).padStart(2, "0")}`,
    item_id: `item-${String((index % 125) + 1).padStart(3, "0")}`,
    score: 4,
    answered_at: null,
  }));

  const rangeCalls: Array<{ from: number; to: number }> = [];

  return {
    rangeCalls,
    reader: {
      from(table: string) {
        if (table !== "responses") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select() {
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
          },
        };
      },
    },
  };
}

describe("loadPagedResponsesByRespondentIds", () => {
  it("loads all response pages beyond the PostgREST page cap", async () => {
    const { reader, rangeCalls } = buildReader(1250);

    const rows = await loadPagedResponsesByRespondentIds(reader as never, [
      "respondent-01",
      "respondent-02",
    ]);

    expect(rows).toHaveLength(1250);
    expect(rangeCalls).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { buildCampaignInstrumentRefs } from "../extract";

describe("buildCampaignInstrumentRefs", () => {
  it("prefers canonical campaign_instruments ordering when available", () => {
    const refs = buildCampaignInstrumentRefs({
      id: "campaign-1",
      instrument_id: "i-core",
      module_instrument_ids: ["i-old-module"],
      campaign_instruments: [
        { instrument_id: "i-cam", instrument_type: "module", sort_order: 2 },
        { instrument_id: "i-core", instrument_type: "base", sort_order: 0 },
        { instrument_id: "i-dig", instrument_type: "module", sort_order: 1 },
      ],
    });

    expect(refs).toEqual([
      { instrumentId: "i-core", instrumentType: "base", sortOrder: 0 },
      { instrumentId: "i-dig", instrumentType: "module", sortOrder: 1 },
      { instrumentId: "i-cam", instrumentType: "module", sortOrder: 2 },
    ]);
  });

  it("falls back to campaign instrument and module array during migration", () => {
    const refs = buildCampaignInstrumentRefs({
      id: "campaign-2",
      instrument_id: "i-core",
      module_instrument_ids: ["i-cam", "i-dig"],
    });

    expect(refs).toEqual([
      { instrumentId: "i-core", instrumentType: "base", sortOrder: 0 },
      { instrumentId: "i-cam", instrumentType: "module", sortOrder: 1 },
      { instrumentId: "i-dig", instrumentType: "module", sortOrder: 2 },
    ]);
  });
});

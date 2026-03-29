import { describe, expect, it } from "vitest";
import { buildSemanticResultFamilies } from "@/lib/semantic-results";

describe("buildSemanticResultFamilies", () => {
  it("separates core and module dimensions", () => {
    const families = buildSemanticResultFamilies([
      {
        dimensionCode: "ENG",
        dimensionName: "Engagement",
        analyticsCategory: "engagement",
        instrumentType: "base",
        avgScore: 4.3,
        favorabilityPct: 82,
      },
      {
        dimensionCode: "CAM",
        dimensionName: "Cambio",
        analyticsCategory: "modulos",
        instrumentType: "module",
        avgScore: 3.9,
        favorabilityPct: 70,
      },
    ]);

    expect(families.map((family) => family.family)).toEqual(["core", "modules"]);
    expect(families[1]?.dimensions[0]?.dimensionCode).toBe("CAM");
  });
});

import { describe, expect, it } from "vitest";
import { buildInstrumentQualityReport } from "@/lib/quality/instrument-quality";

describe("buildInstrumentQualityReport", () => {
  it("flags weak dimensions and weak items while preserving strong ones", () => {
    const report = buildInstrumentQualityReport({
      sample: {
        populationN: 80,
        sampleN: 24,
        responseRate: 72,
        marginOfError: 6.4,
      },
      campaignQuality: {
        qualityLabel: "medium",
        respondentCoveragePct: 95,
        validRespondentPct: 87.5,
        duplicateIngestEvents: 0,
        failedIngestEvents: 0,
        demographicCompletenessPct: {
          department: 96,
          tenure: 92,
          gender: 91,
        },
      },
      dimensions: [
        {
          code: "LID",
          name: "Liderazgo",
          alpha: 0.56,
          alphaStatus: "calculated",
          rwg: 0.42,
          respondentCount: 12,
          itemScores: [
            {
              itemId: "lid-1",
              itemText: "Mi lider comunica con claridad",
              scores: [5, 4, 5, 4, 4, 5, 4, 4, 5, 4, 5, 4],
            },
            {
              itemId: "lid-2",
              itemText: "Recibo apoyo de mi lider",
              scores: [2, 3, 2, 2, 3, 2, 2, 3, 2, 2, 3, 2],
            },
            {
              itemId: "lid-3",
              itemText: "Mi lider escucha activamente",
              scores: [5, 5, null, 4, 5, null, 4, 4, 5, 5, null, 4],
            },
          ],
        },
        {
          code: "COM",
          name: "Compensacion",
          alpha: 0.82,
          alphaStatus: "calculated",
          rwg: 0.74,
          respondentCount: 12,
          itemScores: [
            {
              itemId: "com-1",
              itemText: "Mi compensacion es justa",
              scores: [4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5],
            },
            {
              itemId: "com-2",
              itemText: "Conozco mis beneficios",
              scores: [4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5],
            },
            {
              itemId: "com-3",
              itemText: "La empresa cumple lo prometido",
              scores: [5, 4, 5, 4, 5, 5, 4, 4, 5, 4, 5, 5],
            },
          ],
        },
      ],
    });

    expect(report.overallStatus).toBe("precaucion");
    expect(report.dimensionWarnings).toContain("low_alpha_dimensions");
    expect(report.dimensionWarnings).toContain("low_rwg_dimensions");
    expect(report.dimensions).toHaveLength(2);

    const lid = report.dimensions.find((dimension) => dimension.code === "LID");
    expect(lid?.interpretability).toBe("precaucion");
    expect(lid?.weakItems.length).toBeGreaterThan(0);
    expect(lid?.itemDiagnostics.find((item) => item.itemId === "lid-3")?.missingnessPct).toBe(25);

    const com = report.dimensions.find((dimension) => dimension.code === "COM");
    expect(com?.interpretability).toBe("robusto");
    expect(com?.weakItems).toHaveLength(0);
  });

  it("marks the report as non interpretable when the valid sample is too low", () => {
    const report = buildInstrumentQualityReport({
      sample: {
        populationN: 40,
        sampleN: 7,
        responseRate: 38,
        marginOfError: 14.2,
      },
      campaignQuality: {
        qualityLabel: "low",
        respondentCoveragePct: 55,
        validRespondentPct: 45,
        duplicateIngestEvents: 1,
        failedIngestEvents: 1,
        demographicCompletenessPct: {
          department: 60,
          tenure: 55,
          gender: 40,
        },
      },
      dimensions: [
        {
          code: "ENG",
          name: "Engagement",
          alpha: null,
          alphaStatus: "insufficient_n",
          rwg: null,
          respondentCount: 7,
          itemScores: [
            {
              itemId: "eng-1",
              itemText: "Recomendaria esta empresa",
              scores: [5, 4, 4, 3, 4, 5, 4],
            },
            { itemId: "eng-2", itemText: "Quiero seguir aqui", scores: [4, 4, 3, 3, 4, 4, 3] },
          ],
        },
      ],
    });

    expect(report.overallStatus).toBe("no_interpretable");
    expect(report.warnings).toContain("valid_sample_too_low");
    expect(report.dimensions[0]?.interpretability).toBe("no_interpretable");
  });
});

import { describe, expect, it } from "vitest";
import { buildAiEvaluationMatrix } from "@/lib/quality/ai-evaluation";

describe("buildAiEvaluationMatrix", () => {
  it("scores available insight types and penalizes unsupported references", () => {
    const matrix = buildAiEvaluationMatrix({
      campaignQualityStatus: "precaucion",
      qualityWarnings: ["low_alpha_dimensions"],
      dimensions: [
        { code: "LID", name: "Liderazgo", avgScore: 3.2, favorabilityPct: 45 },
        { code: "COM", name: "Compensacion", avgScore: 4.3, favorabilityPct: 81 },
        { code: "ENG", name: "Engagement", avgScore: 3.6, favorabilityPct: 58 },
      ],
      drivers: [{ code: "LID", name: "Liderazgo", r: 0.61 }],
      alerts: [{ severity: "high", dimensionCode: "LID", message: "Liderazgo en riesgo" }],
      insightTypes: [
        {
          insightType: "dashboard_narrative",
          provider: "openai",
          model: "gpt-4o",
          data: {
            executive_summary: "Compensacion es una fortaleza, pero MIST presenta riesgo alto.",
            highlights: ["Compensacion destaca con puntajes favorables."],
            concerns: ["Liderazgo requiere intervencion y la dimension MIST preocupa."],
            recommendation: "Priorizar conversaciones con lideres y revisar feedback.",
          },
        },
        {
          insightType: "driver_insights",
          provider: "openai",
          model: "gpt-4o",
          data: {
            narrative: "Liderazgo explica buena parte del compromiso.",
            paradoxes: [],
            quick_wins: [
              {
                dimension: "Liderazgo",
                action: "Entrenar a jefaturas en feedback",
                impact: "Mejora el compromiso",
              },
            ],
          },
        },
        {
          insightType: "alert_context",
          provider: "openai",
          model: "gpt-4o",
          data: [
            {
              alert_index: 0,
              root_cause: "Jefaturas inconsistentes",
              recommendation: "Alinear rutinas",
            },
          ],
        },
      ],
    });

    expect(matrix.coverage.generatedInsightTypes).toBe(3);
    expect(matrix.coverage.expectedInsightTypes).toBe(5);
    expect(matrix.operational.successRatePct).toBe(60);
    expect(matrix.methodological.overallScore).toBeLessThan(90);

    const dashboard = matrix.rows.find((row) => row.insightType === "dashboard_narrative");
    expect(dashboard?.methodological.dataFidelityScore).toBeLessThan(80);
    expect(dashboard?.warnings).toContain("unsupported_dimension_references");
  });

  it("returns a stable empty matrix when no AI outputs exist", () => {
    const matrix = buildAiEvaluationMatrix({
      campaignQualityStatus: "robusto",
      qualityWarnings: [],
      dimensions: [{ code: "ENG", name: "Engagement", avgScore: 4.1, favorabilityPct: 78 }],
      drivers: [],
      alerts: [],
      insightTypes: [],
    });

    expect(matrix.coverage.generatedInsightTypes).toBe(0);
    expect(matrix.operational.successRatePct).toBe(0);
    expect(matrix.rows).toHaveLength(0);
    expect(matrix.warnings).toContain("missing_ai_outputs");
  });
});

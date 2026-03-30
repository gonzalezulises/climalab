import { describe, expect, it } from "vitest";
import {
  buildGovernedInsightEnvelope,
  extractInsightContent,
  getInsightContract,
  validateInsightPayload,
  type GovernedInsightClaim,
} from "@/lib/ai/contracts";

describe("AI contracts", () => {
  it("validates a dashboard narrative payload against its contract", () => {
    const result = validateInsightPayload("dashboard_narrative", {
      executive_summary: "El clima general es estable con fortalezas visibles en liderazgo.",
      highlights: ["LID mejora respecto al promedio esperado"],
      concerns: ["COM sigue por debajo del umbral deseado"],
      recommendation: "Priorizar una revisión de compensación y comunicación gerencial.",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.highlights).toHaveLength(1);
    }
  });

  it("rejects malformed payloads", () => {
    const result = validateInsightPayload("driver_insights", {
      narrative: "Texto sin quick wins válidos",
      paradoxes: "esto debería ser array",
      quick_wins: [],
    });

    expect(result.success).toBe(false);
  });

  it("wraps validated content in a governed envelope and can unwrap it", () => {
    const contract = getInsightContract("dashboard_narrative");
    const claims: GovernedInsightClaim[] = [
      {
        statement: "LID aparece como fortaleza visible",
        dimensionCodes: ["LID"],
        metricRefs: ["campaign_results.dimension.LID"],
        confidence: "high",
      },
    ];

    const envelope = buildGovernedInsightEnvelope({
      contract,
      content: {
        executive_summary: "Resumen ejecutivo",
        highlights: ["Liderazgo sólido"],
        concerns: ["Compensación rezagada"],
        recommendation: "Actuar sobre compensación.",
      },
      claims,
      qualityCautions: ["Interpretar con cautela por ONA diferido"],
      warnings: ["partial_ai_coverage"],
    });

    expect(envelope.governance.promptVersion).toBe(contract.promptVersion);
    expect(envelope.governance.claims).toEqual(claims);
    expect(extractInsightContent(envelope)).toEqual({
      executive_summary: "Resumen ejecutivo",
      highlights: ["Liderazgo sólido"],
      concerns: ["Compensación rezagada"],
      recommendation: "Actuar sobre compensación.",
    });
  });
});

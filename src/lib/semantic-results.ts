export type SemanticDimensionRow = {
  dimensionCode: string;
  dimensionName: string;
  analyticsCategory: string | null;
  instrumentType: "base" | "module" | null;
  avgScore: number;
  favorabilityPct: number;
  baselineDelta?: number | null;
};

export type SemanticResultFamily = {
  family: "core" | "modules";
  avgScore: number;
  favorabilityPct: number;
  dimensions: SemanticDimensionRow[];
  longitudinal?: {
    hasBaseline: boolean;
    averageDelta: number;
    improvingCount: number;
    decliningCount: number;
  };
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildSemanticResultFamilies(rows: SemanticDimensionRow[]): SemanticResultFamily[] {
  const families: Record<"core" | "modules", SemanticDimensionRow[]> = {
    core: [],
    modules: [],
  };

  for (const row of rows) {
    if (row.instrumentType === "module" || row.analyticsCategory === "modulos") {
      families.modules.push(row);
    } else {
      families.core.push(row);
    }
  }

  return (["core", "modules"] as const)
    .filter((family) => families[family].length > 0)
    .map((family) => ({
      family,
      avgScore: round(
        (families[family].reduce((sum, row) => sum + row.avgScore, 0) / families[family].length) *
          100
      ),
      favorabilityPct: round(
        (families[family].reduce((sum, row) => sum + row.favorabilityPct, 0) /
          families[family].length) *
          100
      ),
      dimensions: families[family].sort((a, b) => b.avgScore - a.avgScore),
      longitudinal: (() => {
        const withBaseline = families[family].filter(
          (row) => typeof row.baselineDelta === "number"
        );
        if (withBaseline.length === 0) {
          return {
            hasBaseline: false,
            averageDelta: 0,
            improvingCount: 0,
            decliningCount: 0,
          };
        }

        const SIGNIFICANT_DELTA_THRESHOLD = 0.05;
        const deltas = withBaseline.map((row) => row.baselineDelta as number);
        return {
          hasBaseline: true,
          averageDelta: round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length),
          improvingCount: deltas.filter((value) => value > SIGNIFICANT_DELTA_THRESHOLD).length,
          decliningCount: deltas.filter((value) => value < -SIGNIFICANT_DELTA_THRESHOLD).length,
        };
      })(),
    }));
}

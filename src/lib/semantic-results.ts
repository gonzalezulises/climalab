export type SemanticDimensionRow = {
  dimensionCode: string;
  dimensionName: string;
  analyticsCategory: string | null;
  instrumentType: "base" | "module" | null;
  avgScore: number;
  favorabilityPct: number;
};

export type SemanticResultFamily = {
  family: "core" | "modules";
  avgScore: number;
  favorabilityPct: number;
  dimensions: SemanticDimensionRow[];
};

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
      avgScore:
        Math.round(
          (families[family].reduce((sum, row) => sum + row.avgScore, 0) / families[family].length) *
            100
        ) / 100,
      favorabilityPct:
        Math.round(
          (families[family].reduce((sum, row) => sum + row.favorabilityPct, 0) /
            families[family].length) *
            100
        ) / 100,
      dimensions: families[family].sort((a, b) => b.avgScore - a.avgScore),
    }));
}

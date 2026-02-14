"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GapAnalysisChart, DepartmentComparisonChart } from "@/components/results/benchmark-charts";
import { CsvDownloadButton } from "@/components/results/csv-download-button";

type OverallRanking = {
  department: string;
  avgScore: number;
  avgFav: number;
  n: number;
  strengths: string[];
  weaknesses: string[];
};

type DimensionGap = {
  code: string;
  name: string;
  gap: number;
  best: { dept: string; score: number };
  worst: { dept: string; score: number };
};

type HeatmapRow = {
  segment_key: string;
  dimension_code: string;
  avg_score: number;
  favorability_pct: number;
  respondent_count: number;
};

function scoreColor(score: number) {
  if (score >= 4.5) return "bg-green-700 text-white";
  if (score >= 4.2) return "bg-green-500 text-white";
  if (score >= 3.8) return "bg-yellow-400 text-black";
  if (score >= 3.5) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
}

export function BenchmarksClient({
  overallRanking,
  dimensionGaps,
  heatmapData,
  dimensionNames,
}: {
  overallRanking: OverallRanking[];
  dimensionGaps: DimensionGap[];
  heatmapData: HeatmapRow[];
  dimensionNames: Record<string, string>;
}) {
  const departments = overallRanking.map((d) => d.department);
  const dimensionCodes = [...new Set(heatmapData.map((d) => d.dimension_code))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Benchmarks Internos</h1>
        <CsvDownloadButton
          data={overallRanking.map((d) => ({
            department: d.department,
            avgScore: d.avgScore,
            avgFav: d.avgFav,
            n: d.n,
            strengths: d.strengths.join("; "),
            weaknesses: d.weaknesses.join("; "),
          }))}
          filename="benchmarks"
          columns={{
            department: "Departamento",
            avgScore: "Score promedio",
            avgFav: "Fav %",
            n: "n",
            strengths: "Fortalezas",
            weaknesses: "Debilidades",
          }}
        />
      </div>

      {/* Department ranking cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {overallRanking.map((dept, i) => (
          <Card key={dept.department} className={i === 0 ? "border-green-300" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{dept.department}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  #{i + 1} | n={dept.n}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-2xl font-bold px-2 py-0.5 rounded ${scoreColor(dept.avgScore)}`}
                >
                  {dept.avgScore.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">{dept.avgFav}% favorable</span>
              </div>
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Fortalezas</p>
                <div className="flex flex-wrap gap-1">
                  {dept.strengths.map((s) => (
                    <Badge key={s} className="bg-green-100 text-green-800 text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-red-700 mb-1">Oportunidades</p>
                <div className="flex flex-wrap gap-1">
                  {dept.weaknesses.map((w) => (
                    <Badge key={w} className="bg-red-100 text-red-800 text-xs">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gap analysis */}
      <GapAnalysisChart gaps={dimensionGaps} />

      {/* Department comparison */}
      <DepartmentComparisonChart
        departments={departments}
        dimensionCodes={dimensionCodes}
        dimensionNames={dimensionNames}
        heatmapData={heatmapData}
      />
    </div>
  );
}

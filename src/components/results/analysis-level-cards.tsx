"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ANALYSIS_LEVELS, CATEGORY_LABELS } from "@/lib/constants";

type CategoryScore = {
  category: string;
  avg_score: number;
  favorability_pct: number;
};

function classifyFav(fav: number) {
  if (fav >= 90) return { label: "Excepcional", bg: "bg-green-100 text-green-800" };
  if (fav >= 80) return { label: "Sólida", bg: "bg-cyan-100 text-cyan-800" };
  if (fav >= 70) return { label: "Aceptable", bg: "bg-blue-100 text-blue-800" };
  if (fav >= 60) return { label: "Atención", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Crisis", bg: "bg-red-100 text-red-800" };
}

export function AnalysisLevelCards({
  categories,
}: {
  categories: CategoryScore[];
}) {
  const levels = Object.entries(ANALYSIS_LEVELS);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {levels.map(([key, level]) => {
        const levelCategories = categories.filter((c) =>
          level.categories.includes(c.category)
        );

        if (levelCategories.length === 0) return null;

        const avgScore =
          levelCategories.reduce((s, c) => s + c.avg_score, 0) /
          levelCategories.length;
        const avgFav =
          levelCategories.reduce((s, c) => s + c.favorability_pct, 0) /
          levelCategories.length;
        const cls = classifyFav(avgFav);

        return (
          <Card key={key}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold">{level.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {level.description}
                  </p>
                </div>
                <Badge className={cls.bg}>{cls.label}</Badge>
              </div>
              <p className="text-2xl font-bold">{avgScore.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                {levelCategories
                  .map((c) => CATEGORY_LABELS[c.category] ?? c.category)
                  .join(", ")}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

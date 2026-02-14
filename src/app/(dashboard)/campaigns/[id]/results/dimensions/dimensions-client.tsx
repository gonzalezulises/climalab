"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_LABELS, ANALYSIS_LEVELS } from "@/lib/constants";
import { AnalysisLevelCards } from "@/components/results/analysis-level-cards";
import { CsvDownloadButton } from "@/components/results/csv-download-button";

type DimensionResult = {
  code: string;
  name: string;
  avg: number;
  fav: number;
  std: number;
  n: number;
  category: string;
};

type ItemResult = {
  id: string;
  code: string;
  text: string;
  avg: number;
  fav: number;
};

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

function DimensionCard({ dim, items }: { dim: DimensionResult; items: ItemResult[] }) {
  const cls = classifyFav(dim.fav);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{dim.name}</CardTitle>
          <Badge className={cls.bg}>{cls.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold">{dim.avg.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">
            Fav: {dim.fav}% | n={dim.n}
          </span>
        </div>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs truncate" title={item.text}>
                  {item.text}
                </p>
              </div>
              <span className="text-xs font-medium w-10 text-right">{item.avg.toFixed(2)}</span>
              <div className="w-16 h-1.5 rounded-full bg-gray-200">
                <div
                  className="h-1.5 rounded-full bg-blue-600"
                  style={{ width: `${(item.avg / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Map categories to EMCO levels
const categoryToLevel: Record<string, string> = {};
for (const [level, config] of Object.entries(ANALYSIS_LEVELS)) {
  for (const cat of config.categories) {
    categoryToLevel[cat] = level;
  }
}

export function DimensionsClient({
  dimensionResults,
  itemResults,
  categories,
}: {
  dimensionResults: DimensionResult[];
  itemResults: ItemResult[];
  categories: CategoryScore[];
}) {
  const [view, setView] = useState<"category" | "level">("category");

  const hasModules = dimensionResults.some((d) => d.category === "modulos");
  const categoryKeys = [
    "bienestar",
    "direccion",
    "compensacion",
    "cultura",
    "engagement",
    ...(hasModules ? ["modulos"] : []),
  ];
  const levelKeys = ["individual", "interpersonal", "organizacional"];

  function renderDimGrid(dims: DimensionResult[]) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dims
          .sort((a, b) => b.avg - a.avg)
          .map((dim) => (
            <DimensionCard
              key={dim.code}
              dim={dim}
              items={itemResults.filter((i) => i.code === dim.code).sort((a, b) => b.avg - a.avg)}
            />
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Análisis por Dimensión</h1>
        <div className="flex items-center gap-2">
          <CsvDownloadButton
            data={dimensionResults.map((d) => ({
              code: d.code,
              name: d.name,
              category: d.category,
              avg: d.avg,
              fav: d.fav,
              std: d.std,
              n: d.n,
            }))}
            filename="dimensiones"
            columns={{
              code: "Código",
              name: "Nombre",
              category: "Categoría",
              avg: "Score",
              fav: "Fav %",
              std: "Desv. Est.",
              n: "n",
            }}
          />
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              onClick={() => setView("category")}
              className={`px-3 py-1 text-xs rounded ${view === "category" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Por Categoría
            </button>
            <button
              onClick={() => setView("level")}
              className={`px-3 py-1 text-xs rounded ${view === "level" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Por Nivel de Análisis
            </button>
          </div>
        </div>
      </div>

      {view === "category" ? (
        <Tabs defaultValue="todas">
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            {categoryKeys.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="todas" className="mt-4">
            {renderDimGrid(dimensionResults)}
          </TabsContent>

          {categoryKeys.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-4">
              {renderDimGrid(dimensionResults.filter((d) => d.category === cat))}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-6">
          <AnalysisLevelCards categories={categories} />

          {levelKeys.map((level) => {
            const levelConfig = ANALYSIS_LEVELS[level];
            const dims = dimensionResults.filter((d) =>
              levelConfig.categories.includes(d.category)
            );
            if (dims.length === 0) return null;
            return (
              <div key={level}>
                <h2 className="text-base font-semibold mb-3">{levelConfig.label}</h2>
                <p className="text-xs text-muted-foreground mb-4">{levelConfig.description}</p>
                {renderDimGrid(dims)}
              </div>
            );
          })}

          {/* ENG as transversal */}
          {dimensionResults.some((d) => d.category === "engagement") && (
            <div>
              <h2 className="text-base font-semibold mb-3">Transversal</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Engagement como variable dependiente transversal a los tres niveles de análisis
              </p>
              {renderDimGrid(dimensionResults.filter((d) => d.category === "engagement"))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

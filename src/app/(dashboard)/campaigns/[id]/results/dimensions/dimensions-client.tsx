"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_LABELS, ANALYSIS_LEVELS } from "@/lib/constants";
import { classifyFavorability, favToHex } from "@/lib/score-utils";
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

function DimensionCard({ dim, items }: { dim: DimensionResult; items: ItemResult[] }) {
  const [expanded, setExpanded] = useState(false);
  const cls = classifyFavorability(dim.fav);
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => setExpanded((v) => !v)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{dim.name}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge className={cls.bg}>{cls.label}</Badge>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
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
            <div key={item.id}>
              {expanded ? (
                <div className="space-y-1">
                  <p className="text-xs">{item.text}</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted-foreground">{item.fav}%</span>
                    <span className="text-xs font-medium">{item.avg.toFixed(2)}</span>
                    <div className="w-16 h-1.5 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(item.avg / 5) * 100}%`,
                          backgroundColor: favToHex(item.fav),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" title={item.text}>
                      {item.text}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{item.fav}%</span>
                  <span className="text-xs font-medium w-10 text-right">{item.avg.toFixed(2)}</span>
                  <div className="w-16 h-1.5 rounded-full bg-gray-200">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(item.avg / 5) * 100}%`,
                        backgroundColor: favToHex(item.fav),
                      }}
                    />
                  </div>
                </div>
              )}
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
  const [view, setView] = useState<"category" | "level" | "topbottom">("category");

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
            <button
              onClick={() => setView("topbottom")}
              className={`px-3 py-1 text-xs rounded ${view === "topbottom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Top/Bottom Ítems
            </button>
          </div>
        </div>
      </div>

      {view === "topbottom" ? (
        (() => {
          const allItems = [...itemResults].map((item) => {
            const dim = dimensionResults.find((d) => d.code === item.code);
            return { ...item, dimName: dim?.name ?? item.code };
          });
          const top10 = [...allItems].sort((a, b) => b.avg - a.avg).slice(0, 10);
          const bottom10 = [...allItems].sort((a, b) => a.avg - b.avg).slice(0, 10);

          function renderItemList(items: typeof top10, variant: "top" | "bottom") {
            const borderClass = variant === "top" ? "border-green-200" : "border-red-200";
            const titleClass = variant === "top" ? "text-green-700" : "text-red-700";
            const title = variant === "top" ? "Top 10 Ítems" : "Bottom 10 Ítems";
            return (
              <Card className={borderClass}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${titleClass}`}>{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground w-5 pt-0.5">{idx + 1}.</span>
                      <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                        {item.code}
                      </Badge>
                      <p className="text-xs flex-1 min-w-0">{item.text}</p>
                      <span className="text-xs text-muted-foreground w-8 text-right shrink-0 pt-0.5">
                        {item.fav}%
                      </span>
                      <span className="text-xs font-bold w-10 text-right shrink-0 pt-0.5">
                        {item.avg.toFixed(2)}
                      </span>
                      <div className="w-14 h-1.5 rounded-full bg-gray-200 shrink-0 mt-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${(item.avg / 5) * 100}%`,
                            backgroundColor: favToHex(item.fav),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="grid gap-4 md:grid-cols-2">
              {renderItemList(top10, "top")}
              {renderItemList(bottom10, "bottom")}
            </div>
          );
        })()
      ) : view === "category" ? (
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

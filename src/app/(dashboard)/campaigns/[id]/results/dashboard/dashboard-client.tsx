"use client";

import { useState, useEffect, useTransition } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { compareCampaigns } from "@/actions/campaigns";
import { generateAllInsights } from "@/actions/ai-insights";
import type { DashboardNarrative } from "@/actions/ai-insights";
import { AnalysisLevelCards } from "@/components/results/analysis-level-cards";
import { INDICATOR_TYPES, CATEGORY_LABELS } from "@/lib/constants";
import { classifyFavorability, favToHex, SEVERITY_LABELS } from "@/lib/score-utils";
import type { BusinessIndicator } from "@/types";

type Props = {
  campaignId: string;
  engScore: number;
  globalFav: number;
  enpsScore: number;
  responseRate: number;
  sampleN: number;
  populationN: number;
  dimensionResults: Array<{ code: string; name: string; avg: number; fav: number }>;
  profiles: {
    ambassadors: { count: number; pct: number };
    committed: { count: number; pct: number };
    neutral: { count: number; pct: number };
    disengaged: { count: number; pct: number };
  } | null;
  alerts: Array<{ severity: string; message: string; value: number }>;
  categories: Array<{ category: string; avg_score: number; favorability_pct: number }>;
  indicators: BusinessIndicator[];
  indicatorTrend: Array<{
    campaign_id: string;
    campaign_name: string;
    ends_at: string;
    indicators: BusinessIndicator[];
  }>;
  previousCampaigns: Array<{ id: string; name: string }>;
  initialNarrative: DashboardNarrative | null;
};

export function DashboardClient({
  campaignId,
  engScore,
  globalFav,
  enpsScore,
  responseRate,
  sampleN,
  populationN,
  dimensionResults,
  profiles,
  alerts,
  categories,
  indicators,
  indicatorTrend,
  previousCampaigns,
  initialNarrative,
}: Props) {
  const [selectedPrevId, setSelectedPrevId] = useState("");
  const [compData, setCompData] = useState<
    { dimension: string; current: number; previous: number; delta: number }[] | null
  >(null);
  const [narrative, setNarrative] = useState<DashboardNarrative | null>(initialNarrative);
  const [isGenerating, startGeneration] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPrevId) {
      setCompData(null);
      return;
    }
    compareCampaigns(campaignId, selectedPrevId).then((result) => {
      if (result.success) {
        const merged = result.data.current.map((c) => {
          const prev = result.data.previous.find((p) => p.code === c.code);
          return {
            dimension: c.name,
            current: c.avg,
            previous: prev?.avg ?? 0,
            delta: prev ? +(c.avg - prev.avg).toFixed(2) : 0,
          };
        });
        setCompData(merged);
      }
    });
  }, [selectedPrevId, campaignId]);

  const radarData = dimensionResults.map((d) => ({
    dimension: d.code,
    score: d.avg,
    fullMark: 5,
  }));

  const lollipopData = [...dimensionResults].sort((a, b) => a.avg - b.avg);

  const donutData = profiles
    ? [
        {
          name: "Embajadores",
          value: profiles.ambassadors.pct,
          count: profiles.ambassadors.count,
          color: "#15803d",
        },
        {
          name: "Comprometidos",
          value: profiles.committed.pct,
          count: profiles.committed.count,
          color: "#2563eb",
        },
        {
          name: "Neutrales",
          value: profiles.neutral.pct,
          count: profiles.neutral.count,
          color: "#eab308",
        },
        {
          name: "Desvinculados",
          value: profiles.disengaged.pct,
          count: profiles.disengaged.count,
          color: "#dc2626",
        },
      ]
    : [];

  // Strengths & weaknesses (top/bottom 3 by fav)
  const sortedDims = [...dimensionResults].sort((a, b) => b.fav - a.fav);
  const strengths = sortedDims.slice(0, 3);
  const weaknesses = sortedDims.slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{engScore.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">de 5.0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Favorabilidad Global</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{globalFav}%</p>
            <div className="mt-1 h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${Math.min(globalFav, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">eNPS</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${enpsScore >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {enpsScore > 0 ? "+" : ""}
              {enpsScore}
            </p>
            <p className="text-xs text-muted-foreground">
              {enpsScore >= 50 ? "Excelente" : enpsScore >= 0 ? "Aceptable" : "Necesita mejora"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tasa de Respuesta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{responseRate}%</p>
            <p className="text-xs text-muted-foreground">
              {sampleN} / {populationN}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      {dimensionResults.length >= 6 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-700">Fortalezas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {strengths.map((d) => (
                <div key={d.code} className="flex items-center justify-between">
                  <span className="text-sm">{d.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{d.avg.toFixed(2)}</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">{d.fav}%</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-700">Oportunidades de mejora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weaknesses.map((d) => (
                <div key={d.code} className="flex items-center justify-between">
                  <span className="text-sm">{d.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{d.avg.toFixed(2)}</span>
                    <Badge className="bg-amber-100 text-amber-800 text-xs">{d.fav}%</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Narrative */}
      {narrative ? (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Resumen ejecutivo IA
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  startGeneration(async () => {
                    setAiError(null);
                    const result = await generateAllInsights(campaignId);
                    if (result.success) window.location.reload();
                    else setAiError(result.error);
                  })
                }
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerar"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{narrative.executive_summary}</p>
            {narrative.highlights.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Destacados</p>
                <ul className="text-sm space-y-1">
                  {narrative.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">+</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {narrative.concerns.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-700 mb-1">Preocupaciones</p>
                <ul className="text-sm space-y-1">
                  {narrative.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">!</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-blue-700 mb-1">Recomendación</p>
              <p className="text-sm">{narrative.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Genera insights con IA para obtener un resumen ejecutivo, análisis de comentarios y
                más.
              </p>
              <Button
                size="sm"
                onClick={() =>
                  startGeneration(async () => {
                    setAiError(null);
                    const result = await generateAllInsights(campaignId);
                    if (result.success) window.location.reload();
                    else setAiError(result.error);
                  })
                }
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generar insights IA
              </Button>
            </div>
            {aiError && <p className="text-sm text-destructive">{aiError}</p>}
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="grid gap-4 md:grid-cols-5">
          {categories.map((cat) => {
            const cls = classifyFavorability(cat.favorability_pct);
            return (
              <Card key={cat.category}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[cat.category] ?? cat.category}
                  </p>
                  <p className="text-2xl font-bold">{cat.avg_score.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Fav: {cat.favorability_pct}%</p>
                  <Badge className={cls.bg}>{cls.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Analysis levels */}
      {categories.length > 0 && <AnalysisLevelCards categories={categories} />}

      {/* Radar + Lollipop */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Radar de dimensiones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.3}
                />
                <Tooltip formatter={(v) => [Number(v).toFixed(2), "Score"]} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de dimensiones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={lollipopData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v) => [Number(v).toFixed(2), "Score"]} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {lollipopData.map((d, i) => (
                    <Cell key={i} fill={favToHex(d.fav)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profiles + Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        {profiles && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfiles de engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value}%`}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v}%`, name]} />
                  <Legend formatter={(v) => <span className="text-sm">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alertas principales</CardTitle>
              <CardDescription>{alerts.length} alertas detectadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <Badge className={SEVERITY_LABELS[a.severity]?.bg ?? "bg-gray-500 text-white"}>
                      {SEVERITY_LABELS[a.severity]?.label ?? a.severity}
                    </Badge>
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Business indicators */}
      {indicators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicadores de negocio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {indicators.map((ind) => (
                <div key={ind.id} className="flex items-center gap-3 rounded-md border p-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      {INDICATOR_TYPES[ind.indicator_type] ?? ind.indicator_type}
                    </p>
                    <p className="text-lg font-bold">
                      {Number(ind.indicator_value)}
                      {ind.indicator_unit && (
                        <span className="text-sm text-muted-foreground ml-0.5">
                          {ind.indicator_unit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Co-evolution: business indicators across campaigns */}
      {(() => {
        // Find indicator types present in 2+ campaigns
        const typeCounts = new Map<string, number>();
        for (const wave of indicatorTrend) {
          for (const ind of wave.indicators) {
            typeCounts.set(ind.indicator_type, (typeCounts.get(ind.indicator_type) ?? 0) + 1);
          }
        }
        const trendTypes = [...typeCounts.entries()]
          .filter(([, count]) => count >= 2)
          .map(([type]) => type);

        if (trendTypes.length === 0 || indicatorTrend.length < 2) return null;

        const TREND_COLORS = ["#f59e0b", "#ef4444", "#22c55e", "#8b5cf6"];

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Co-evolución clima e indicadores</CardTitle>
              <CardDescription>
                Evolución temporal de indicadores de negocio entre mediciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendTypes.map((type, idx) => {
                const chartData = indicatorTrend.map((wave) => {
                  const ind = wave.indicators.find((i) => i.indicator_type === type);
                  return {
                    name: wave.campaign_name,
                    valor: ind ? Number(ind.indicator_value) : null,
                  };
                });
                const unit =
                  indicatorTrend.flatMap((w) => w.indicators).find((i) => i.indicator_type === type)
                    ?.indicator_unit ?? "";

                return (
                  <div key={type} className="mb-4 last:mb-0">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {INDICATOR_TYPES[type] ?? type} ({unit})
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="valor"
                          stroke={TREND_COLORS[idx % TREND_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {/* Wave comparison */}
      {previousCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Comparación wave-over-wave</CardTitle>
                <CardDescription>Compara con una medición anterior</CardDescription>
              </div>
              <Select value={selectedPrevId} onValueChange={setSelectedPrevId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecciona campaña" />
                </SelectTrigger>
                <SelectContent>
                  {previousCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          {compData && (
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={compData} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis type="category" dataKey="dimension" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v) => Number(v).toFixed(2)} />
                  <Legend />
                  <Bar dataKey="previous" name="Anterior" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="current" name="Actual" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2">
                {compData.map((d) => (
                  <div key={d.dimension} className="text-center text-xs overflow-hidden">
                    <p className="font-medium truncate" title={d.dimension}>
                      {d.dimension}
                    </p>
                    <p
                      className={`text-sm font-bold ${d.delta > 0 ? "text-green-600" : d.delta < 0 ? "text-red-600" : "text-gray-500"}`}
                    >
                      {d.delta > 0 ? "+" : ""}
                      {d.delta}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

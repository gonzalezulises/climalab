"use client";

import { useState, useEffect } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compareCampaigns } from "@/actions/campaigns";

function classifyScore(fav: number) {
  if (fav >= 90) return { label: "Excepcional", color: "#1dc47c", bg: "bg-green-100 text-green-800" };
  if (fav >= 80) return { label: "Sólida", color: "#00B4D8", bg: "bg-cyan-100 text-cyan-800" };
  if (fav >= 70) return { label: "Aceptable", color: "#0052CC", bg: "bg-blue-100 text-blue-800" };
  if (fav >= 60) return { label: "Atención", color: "#F59E0B", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Crisis", color: "#DC2626", bg: "bg-red-100 text-red-800" };
}

function getBarColor(fav: number) {
  if (fav >= 90) return "#1dc47c";
  if (fav >= 80) return "#00B4D8";
  if (fav >= 70) return "#0052CC";
  if (fav >= 60) return "#F59E0B";
  return "#DC2626";
}

type Props = {
  campaignId: string;
  engScore: number;
  globalFav: number;
  enpsScore: number;
  responseRate: number;
  sampleN: number;
  populationN: number;
  dimensionResults: Array<{ code: string; name: string; avg: number; fav: number }>;
  profiles: { ambassadors: { count: number; pct: number }; committed: { count: number; pct: number }; neutral: { count: number; pct: number }; disengaged: { count: number; pct: number } } | null;
  alerts: Array<{ severity: string; message: string; value: number }>;
  categories: Array<{ category: string; avg_score: number; favorability_pct: number }>;
  previousCampaigns: Array<{ id: string; name: string }>;
};

export function DashboardClient({
  campaignId, engScore, globalFav, enpsScore, responseRate,
  sampleN, populationN, dimensionResults, profiles, alerts,
  categories, previousCampaigns,
}: Props) {
  const [selectedPrevId, setSelectedPrevId] = useState("");
  const [compData, setCompData] = useState<{ dimension: string; current: number; previous: number; delta: number }[] | null>(null);

  useEffect(() => {
    if (!selectedPrevId) { setCompData(null); return; }
    compareCampaigns(campaignId, selectedPrevId).then((result) => {
      if (result.success) {
        const merged = result.data.current.map((c) => {
          const prev = result.data.previous.find((p) => p.code === c.code);
          return { dimension: c.name, current: c.avg, previous: prev?.avg ?? 0, delta: prev ? +(c.avg - prev.avg).toFixed(2) : 0 };
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

  const donutData = profiles ? [
    { name: "Embajadores", value: profiles.ambassadors.pct, count: profiles.ambassadors.count, color: "#15803d" },
    { name: "Comprometidos", value: profiles.committed.pct, count: profiles.committed.count, color: "#2563eb" },
    { name: "Neutrales", value: profiles.neutral.pct, count: profiles.neutral.count, color: "#eab308" },
    { name: "Desvinculados", value: profiles.disengaged.pct, count: profiles.disengaged.count, color: "#dc2626" },
  ] : [];

  const sevBadge: Record<string, string> = {
    crisis: "bg-red-600 text-white",
    attention: "bg-yellow-500 text-white",
    risk_group: "bg-orange-500 text-white",
    decline: "bg-purple-500 text-white",
  };

  const catLabels: Record<string, string> = {
    bienestar: "Bienestar", liderazgo: "Liderazgo",
    compensacion: "Compensación", cultura: "Cultura", engagement: "Engagement",
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Engagement</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{engScore.toFixed(2)}</p><p className="text-xs text-muted-foreground">de 5.0</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Favorabilidad Global</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{globalFav}%</p>
            <div className="mt-1 h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(globalFav, 100)}%` }} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">eNPS</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${enpsScore >= 0 ? "text-green-600" : "text-red-600"}`}>
              {enpsScore > 0 ? "+" : ""}{enpsScore}
            </p>
            <p className="text-xs text-muted-foreground">{enpsScore >= 50 ? "Excelente" : enpsScore >= 0 ? "Aceptable" : "Necesita mejora"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tasa de Respuesta</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{responseRate}%</p>
            <p className="text-xs text-muted-foreground">{sampleN} / {populationN}</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="grid gap-4 md:grid-cols-5">
          {categories.map((cat) => {
            const cls = classifyScore(cat.favorability_pct);
            return (
              <Card key={cat.category}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{catLabels[cat.category] ?? cat.category}</p>
                  <p className="text-2xl font-bold">{cat.avg_score.toFixed(2)}</p>
                  <Badge className={cls.bg}>{cls.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Radar + Lollipop */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Radar de dimensiones</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                <Tooltip formatter={(v) => [Number(v).toFixed(2), "Score"]} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ranking de dimensiones</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={lollipopData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v) => [Number(v).toFixed(2), "Score"]} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {lollipopData.map((d, i) => (
                    <Cell key={i} fill={getBarColor(d.fav)} />
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
            <CardHeader><CardTitle className="text-base">Perfiles de engagement</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={donutData} innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value"
                    label={({ name, value }) => `${value}%`}>
                    {donutData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
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
                    <Badge className={sevBadge[a.severity] ?? "bg-gray-500 text-white"}>
                      {a.severity}
                    </Badge>
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
                <SelectTrigger className="w-64"><SelectValue placeholder="Selecciona campaña" /></SelectTrigger>
                <SelectContent>
                  {previousCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                  <div key={d.dimension} className="text-center text-xs">
                    <p className="font-medium truncate">{d.dimension}</p>
                    <p className={`text-sm font-bold ${d.delta > 0 ? "text-green-600" : d.delta < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {d.delta > 0 ? "+" : ""}{d.delta}
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

"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/results/kpi-card";
import { Network, Info } from "lucide-react";
import type { ONAResults } from "@/actions/ona";

const CLUSTER_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

// ---------------------------------------------------------------------------
// Narrative generation (template-based, no LLM)
// ---------------------------------------------------------------------------
function generateNarrative(data: ONAResults): string {
  const { summary, communities, discriminants, bridges } = data;
  const parts: string[] = [];

  // Stability warning first if weak
  if (data.stability) {
    if (data.stability.label === "weak") {
      parts.push(
        `Nota: La estructura comunitaria tiene baja estabilidad (NMI=${data.stability.nmi.toFixed(2)}). Los clusters detectados pueden variar entre ejecuciones y deben interpretarse con cautela.`
      );
    }
  }

  // Community count interpretation
  if (summary.communities === 1) {
    parts.push(
      "La organización presenta una percepción homogénea: todos los colaboradores viven una realidad organizacional similar."
    );
  } else if (summary.communities <= 3) {
    parts.push(
      `Se identificaron ${summary.communities} grupos perceptuales diferenciados dentro de la organización, lo que sugiere que coexisten realidades organizacionales distintas.`
    );
  } else {
    parts.push(
      `La organización está fragmentada en ${summary.communities} comunidades perceptuales, indicando múltiples realidades organizacionales paralelas.`
    );
  }

  // Top discriminants
  if (discriminants.length > 0) {
    const topDims = discriminants
      .slice(0, 3)
      .map((d) => d.code)
      .join(", ");
    parts.push(`Las dimensiones que más diferencian a los grupos son: ${topDims}.`);
  }

  // Best/worst community
  if (communities.length >= 2) {
    const sorted = [...communities].sort((a, b) => b.avg_score - a.avg_score);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    parts.push(
      `El grupo ${best.id + 1} (${best.size} personas, mayoritariamente ${best.dominant_department}) tiene la percepción más favorable (${best.avg_score.toFixed(2)}), mientras que el grupo ${worst.id + 1} (${worst.size} personas, mayoritariamente ${worst.dominant_department}) presenta la percepción más crítica (${worst.avg_score.toFixed(2)}).`
    );
  }

  // Bridges
  if (bridges.length > 0) {
    parts.push(
      `Se identificaron ${bridges.length} nodos puente — personas que conectan múltiples comunidades y pueden actuar como traductores culturales.`
    );
  } else {
    parts.push("No se identificaron nodos puente significativos entre las comunidades.");
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Network className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Análisis de red perceptual no disponible</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          El análisis ONA requiere ejecutar el script de Python{" "}
          <code className="bg-muted px-1 rounded">scripts/ona-analysis.py</code>. Este análisis
          construye un grafo de similitud entre respondentes basado en sus vectores de puntaje
          dimensional, detecta comunidades y calcula métricas de red.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Density color scale
// ---------------------------------------------------------------------------
function densityColor(value: number | null): string {
  if (value === null) return "bg-gray-100";
  if (value >= 0.4) return "bg-green-600 text-white";
  if (value >= 0.25) return "bg-green-400 text-white";
  if (value >= 0.15) return "bg-green-200 text-black";
  if (value >= 0.05) return "bg-gray-100 text-black";
  return "bg-red-100 text-black";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function NetworkClient({ data }: { data: ONAResults | null }) {
  const narrative = useMemo(
    () => (data ? (data.narrative ?? generateNarrative(data)) : ""),
    [data]
  );

  const dimCodes = useMemo(() => (data ? Object.keys(data.global_means).sort() : []), [data]);

  const departments = useMemo(
    () => (data ? Object.keys(data.department_density).sort() : []),
    [data]
  );

  if (!data) return <EmptyState />;

  const { summary, communities, discriminants, department_density, bridges, global_means } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Red Perceptual</h2>
          <p className="text-muted-foreground">Análisis de redes de similitud perceptual (ONA)</p>
        </div>
      </div>

      {/* Section 1: Narrative */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex gap-3 p-4">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">{narrative}</p>
        </CardContent>
      </Card>

      {/* Section 2: KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Nodos" value={summary.nodes} subtitle="Respondentes válidos" />
        <KpiCard label="Conexiones" value={summary.edges} subtitle="Pares similares" />
        <KpiCard
          label="Densidad"
          value={`${(summary.density * 100).toFixed(1)}%`}
          subtitle="Conexiones / posibles"
        />
        <KpiCard label="Comunidades" value={summary.communities} subtitle="Grupos perceptuales" />
        <KpiCard
          label="Modularidad"
          value={summary.modularity.toFixed(3)}
          subtitle={summary.modularity >= 0.3 ? "Estructura clara" : "Estructura difusa"}
        />
        <KpiCard
          label="Clustering"
          value={summary.avg_clustering.toFixed(3)}
          subtitle="Coef. agrupamiento"
        />
        {data.stability && (
          <KpiCard
            label="Estabilidad"
            value={data.stability.nmi.toFixed(3)}
            subtitle={
              data.stability.label === "robust"
                ? "Estructura robusta"
                : data.stability.label === "moderate"
                  ? "Moderada"
                  : "Débil"
            }
          />
        )}
      </div>

      {/* Stability indicator */}
      {data.stability && (
        <Card
          className={
            data.stability.label === "robust"
              ? "border-green-200 bg-green-50/50"
              : data.stability.label === "moderate"
                ? "border-yellow-200 bg-yellow-50/50"
                : "border-red-200 bg-red-50/50"
          }
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Badge
              variant={
                data.stability.label === "robust"
                  ? "default"
                  : data.stability.label === "moderate"
                    ? "secondary"
                    : "destructive"
              }
            >
              {data.stability.label === "robust"
                ? "Estructura robusta"
                : data.stability.label === "moderate"
                  ? "Estructura moderada"
                  : "Estructura débil"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              NMI = {data.stability.nmi.toFixed(3)} sobre {data.stability.iterations} iteraciones de
              Leiden.
              {data.stability.label === "robust"
                ? " Las comunidades detectadas son consistentes y confiables."
                : data.stability.label === "moderate"
                  ? " Las comunidades son parcialmente estables — interpretar con cautela."
                  : " Las comunidades varían significativamente entre ejecuciones — la estructura comunitaria puede ser débil o inexistente."}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Community profiles */}
      <Card>
        <CardHeader>
          <CardTitle>Perfiles de comunidad</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="0">
            <TabsList>
              {communities.map((c) => (
                <TabsTrigger key={c.id} value={String(c.id)}>
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: CLUSTER_COLORS[c.id % CLUSTER_COLORS.length] }}
                  />
                  Grupo {c.id + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {communities.map((comm) => {
              const radarData = dimCodes.map((code) => ({
                dimension: code,
                cluster: comm.dimension_scores[code] ?? 0,
                global: global_means[code] ?? 0,
              }));

              const deptBarData = Object.entries(comm.department_distribution)
                .map(([dept, { count, pct }]) => ({ dept, count, pct }))
                .sort((a, b) => b.count - a.count);

              return (
                <TabsContent key={comm.id} value={String(comm.id)} className="space-y-4">
                  {/* Summary badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {comm.size} personas ({comm.pct}%)
                    </Badge>
                    <Badge variant="outline">Puntaje promedio: {comm.avg_score.toFixed(2)}</Badge>
                    <Badge variant="outline">Depto. dominante: {comm.dominant_department}</Badge>
                  </div>

                  {/* Top differences */}
                  {comm.top_differences.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Mayores diferencias vs. promedio:{" "}
                      </span>
                      {comm.top_differences.map((d, i) => (
                        <span key={d.code}>
                          {d.code}{" "}
                          <span className={d.diff >= 0 ? "text-green-600" : "text-red-600"}>
                            ({d.diff >= 0 ? "+" : ""}
                            {d.diff.toFixed(2)})
                          </span>
                          {i < comm.top_differences.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Radar: cluster vs global */}
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Perfil dimensional vs. promedio global
                      </p>
                      <ResponsiveContainer width="100%" height={320}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                          <Radar
                            name="Grupo"
                            dataKey="cluster"
                            stroke={CLUSTER_COLORS[comm.id % CLUSTER_COLORS.length]}
                            fill={CLUSTER_COLORS[comm.id % CLUSTER_COLORS.length]}
                            fillOpacity={0.3}
                          />
                          <Radar
                            name="Global"
                            dataKey="global"
                            stroke="#94a3b8"
                            fill="#94a3b8"
                            fillOpacity={0.1}
                          />
                          <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Department distribution bar */}
                    <div>
                      <p className="text-sm font-medium mb-2">Distribución por departamento</p>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={deptBarData}
                          layout="vertical"
                          margin={{ left: 10, right: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} unit="%" />
                          <YAxis
                            type="category"
                            dataKey="dept"
                            width={120}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                          <Bar
                            dataKey="pct"
                            fill={CLUSTER_COLORS[comm.id % CLUSTER_COLORS.length]}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Graph visualization */}
      {data.graph_image && (
        <Card>
          <CardHeader>
            <CardTitle>Visualización del grafo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada nodo es un respondente. El color indica la comunidad perceptual. El tamaño
              refleja la centralidad (betweenness). Las conexiones representan alta similitud en el
              perfil dimensional.
            </p>
          </CardHeader>
          <CardContent className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${data.graph_image}`}
              alt="Grafo de similitud perceptual"
              className="max-w-full h-auto rounded-lg border"
              style={{ maxHeight: 600 }}
            />
          </CardContent>
        </Card>
      )}

      {/* Section 4: Discriminant dimensions */}
      <Card>
        <CardHeader>
          <CardTitle>Dimensiones discriminantes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dimensiones con mayor diferencia entre comunidades (spread = max - min)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(300, discriminants.length * 36)}>
            <BarChart data={discriminants} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, "auto"]} />
              <YAxis type="category" dataKey="code" width={60} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => Number(value).toFixed(3)}
                labelFormatter={(label) => `Dimensión: ${label}`}
              />
              <Bar dataKey="spread" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Section 5: Department density heatmap */}
      {departments.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Densidad inter-departamental</CardTitle>
            <p className="text-sm text-muted-foreground">
              Proporción de conexiones entre departamentos. Verde = alta similitud perceptual, rojo
              = baja similitud.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left" />
                  {departments.map((d) => (
                    <th key={d} className="p-2 text-center font-medium truncate max-w-[100px]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map((deptA) => (
                  <tr key={deptA}>
                    <td className="p-2 font-medium truncate max-w-[120px]">{deptA}</td>
                    {departments.map((deptB) => {
                      const val = department_density[deptA]?.[deptB] ?? null;
                      return (
                        <td key={deptB} className={`p-2 text-center ${densityColor(val)}`}>
                          {val !== null ? val.toFixed(2) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Section 6: Bridge nodes */}
      {bridges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nodos puente</CardTitle>
            <p className="text-sm text-muted-foreground">
              Personas con alto betweenness que conectan múltiples comunidades — &quot;traductores
              culturales&quot;.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Comunidad</TableHead>
                  <TableHead className="text-right">Betweenness</TableHead>
                  <TableHead className="text-right">Comunidades</TableHead>
                  <TableHead className="text-right">Conexiones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bridges.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.id}</TableCell>
                    <TableCell>{b.department}</TableCell>
                    <TableCell>
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-1"
                        style={{
                          backgroundColor: CLUSTER_COLORS[b.community % CLUSTER_COLORS.length],
                        }}
                      />
                      Grupo {b.community + 1}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {b.betweenness.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">{b.communities_bridged}</TableCell>
                    <TableCell className="text-right">{b.connections}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section 7: Critical inter-community edges */}
      {data.critical_edges && data.critical_edges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conexiones inter-comunitarias críticas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pares de respondentes de diferentes comunidades con la mayor centralidad de
              intermediación. Representan los &quot;puentes&quot; más transitados entre grupos
              perceptuales.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento A</TableHead>
                  <TableHead>Comunidad</TableHead>
                  <TableHead>Departamento B</TableHead>
                  <TableHead>Comunidad</TableHead>
                  <TableHead className="text-right">Edge Betweenness</TableHead>
                  <TableHead className="text-right">Similitud</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.critical_edges.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{e.source_dept}</TableCell>
                    <TableCell>
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-1"
                        style={{
                          backgroundColor:
                            CLUSTER_COLORS[e.source_community % CLUSTER_COLORS.length],
                        }}
                      />
                      {e.source_community + 1}
                    </TableCell>
                    <TableCell>{e.target_dept}</TableCell>
                    <TableCell>
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-1"
                        style={{
                          backgroundColor:
                            CLUSTER_COLORS[e.target_community % CLUSTER_COLORS.length],
                        }}
                      />
                      {e.target_community + 1}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {e.edge_betweenness.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{e.weight.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

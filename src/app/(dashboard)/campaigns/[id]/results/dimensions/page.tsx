import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function classifyFav(fav: number) {
  if (fav >= 90) return { label: "Excepcional", bg: "bg-green-100 text-green-800" };
  if (fav >= 80) return { label: "Sólida", bg: "bg-cyan-100 text-cyan-800" };
  if (fav >= 70) return { label: "Aceptable", bg: "bg-blue-100 text-blue-800" };
  if (fav >= 60) return { label: "Atención", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Crisis", bg: "bg-red-100 text-red-800" };
}

const categoryLabels: Record<string, string> = {
  bienestar: "Bienestar", liderazgo: "Liderazgo",
  compensacion: "Compensación", cultura: "Cultura", engagement: "Engagement",
};

// Map dimension codes to categories (matches seed)
const dimCategory: Record<string, string> = {
  ORG: "bienestar", PRO: "bienestar", SEG: "bienestar", BAL: "bienestar", CUI: "bienestar", DEM: "bienestar",
  LID: "liderazgo", AUT: "liderazgo", COM: "liderazgo", CON: "liderazgo", ROL: "liderazgo",
  CMP: "compensacion", REC: "compensacion", BEN: "compensacion", EQA: "compensacion",
  COH: "cultura", INN: "cultura", RES: "cultura", DES: "cultura", APR: "cultura",
  ENG: "engagement",
};

export default async function DimensionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, resultsResult] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
  ]);
  if (!campaignResult.success) notFound();

  const results = resultsResult.success ? resultsResult.data : [];

  const dimensionResults = results
    .filter((r) => r.result_type === "dimension" && r.segment_type === "global")
    .map((r) => ({
      code: r.dimension_code!,
      name: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code!,
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
      std: Number(r.std_score),
      n: r.respondent_count ?? 0,
      category: dimCategory[r.dimension_code!] ?? "otro",
    }));

  const itemResults = results
    .filter((r) => r.result_type === "item" && r.segment_type === "global")
    .map((r) => ({
      id: r.segment_key!,
      code: r.dimension_code!,
      text: (r.metadata as { item_text?: string })?.item_text ?? "",
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }));

  const categories = ["bienestar", "liderazgo", "compensacion", "cultura", "engagement"];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Análisis por Dimensión</h1>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>{categoryLabels[cat]}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="todas" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dimensionResults.sort((a, b) => b.avg - a.avg).map((dim) => {
              const cls = classifyFav(dim.fav);
              const items = itemResults.filter((i) => i.code === dim.code).sort((a, b) => b.avg - a.avg);
              return (
                <Card key={dim.code}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{dim.name}</CardTitle>
                      <Badge className={cls.bg}>{cls.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold">{dim.avg.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">Fav: {dim.fav}% | n={dim.n}</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className="flex-1">
                            <p className="text-xs truncate" title={item.text}>{item.text}</p>
                          </div>
                          <span className="text-xs font-medium w-10 text-right">{item.avg.toFixed(2)}</span>
                          <div className="w-16 h-1.5 rounded-full bg-gray-200">
                            <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${(item.avg / 5) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dimensionResults.filter((d) => d.category === cat).sort((a, b) => b.avg - a.avg).map((dim) => {
                const cls = classifyFav(dim.fav);
                const items = itemResults.filter((i) => i.code === dim.code).sort((a, b) => b.avg - a.avg);
                return (
                  <Card key={dim.code}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{dim.name}</CardTitle>
                        <Badge className={cls.bg}>{cls.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-bold">{dim.avg.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">Fav: {dim.fav}% | n={dim.n}</span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <div className="flex-1">
                              <p className="text-xs truncate" title={item.text}>{item.text}</p>
                            </div>
                            <span className="text-xs font-medium w-10 text-right">{item.avg.toFixed(2)}</span>
                            <div className="w-16 h-1.5 rounded-full bg-gray-200">
                              <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${(item.avg / 5) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalClient } from "./technical-client";

export default async function TechnicalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, resultsResult] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
  ]);

  if (!campaignResult.success) notFound();
  const campaign = campaignResult.data;
  const results = resultsResult.success ? resultsResult.data : [];

  // Top 5 / Bottom 5 items
  const itemResults = results
    .filter((r) => r.result_type === "item" && r.segment_type === "global")
    .map((r) => ({
      text: (r.metadata as { item_text?: string })?.item_text ?? "",
      dimension: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code ?? "",
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }))
    .sort((a, b) => b.avg - a.avg);

  const top5 = itemResults.slice(0, 5);
  const bottom5 = itemResults.slice(-5).reverse();

  // Demographics from segment results
  const segResults = results
    .filter((r) => r.result_type === "dimension" && r.segment_type !== "global")
    .map((r) => ({
      segment_key: r.segment_key!,
      segment_type: r.segment_type!,
      respondent_count: r.respondent_count ?? 0,
    }));

  // Count unique respondents per segment
  const demoData: Record<string, Map<string, number>> = {};
  for (const r of segResults) {
    if (!demoData[r.segment_type]) demoData[r.segment_type] = new Map();
    const existing = demoData[r.segment_type].get(r.segment_key) ?? 0;
    if (r.respondent_count > existing) {
      demoData[r.segment_type].set(r.segment_key, r.respondent_count);
    }
  }

  const demographics = Object.entries(demoData).map(([type, map]) => ({
    type,
    segments: [...map.entries()].map(([key, count]) => ({ key, count })),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Ficha Técnica</h1>

      {/* Statistical card */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ficha técnica estadística</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Población (N)</p>
              <p className="text-2xl font-bold">{campaign.population_n ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Muestra válida (n)</p>
              <p className="text-2xl font-bold">{campaign.sample_n ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tasa de respuesta</p>
              <p className="text-2xl font-bold">{campaign.response_rate ?? "—"}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margen de error</p>
              <p className="text-2xl font-bold">±{campaign.margin_of_error ?? "—"}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nivel de confianza</p>
              <p className="text-2xl font-bold">{campaign.confidence_level ?? 95}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics */}
      <TechnicalClient demographics={demographics} />

      {/* Top 5 items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top 5 ítems (mayor score)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {top5.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold w-6 text-green-600">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.dimension}</p>
                </div>
                <span className="font-bold">{item.avg.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground w-14 text-right">{item.fav}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom 5 items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bottom 5 ítems (menor score)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bottom5.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold w-6 text-red-600">#{itemResults.length - i}</span>
                <div className="flex-1">
                  <p className="text-sm">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.dimension}</p>
                </div>
                <span className="font-bold">{item.avg.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground w-14 text-right">{item.fav}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

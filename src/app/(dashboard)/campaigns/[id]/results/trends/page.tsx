import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getTrendsData } from "@/actions/analytics";
import { getTrendsNarrative } from "@/actions/ai-insights";
import { TrendsClient } from "./trends-client";

export default async function TrendsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignResult = await getCampaign(id);
  if (!campaignResult.success) notFound();

  const trendsResult = await getTrendsData(campaignResult.data.organization_id);
  const trends = trendsResult.success ? trendsResult.data : { campaigns: [], series: {} };

  if (trends.campaigns.length < 2) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Tendencias Históricas</h1>
        <p className="text-muted-foreground">
          Se necesitan al menos 2 campañas cerradas para mostrar tendencias.
        </p>
      </div>
    );
  }

  const [narrativeResult, resultsResult] = await Promise.all([
    getTrendsNarrative(id),
    getCampaignResults(id),
  ]);
  const trendsNarrative = narrativeResult.success ? narrativeResult.data : null;

  const waveSignificance: Record<string, { p_value: number; delta: number; effect_label: string }> =
    {};
  if (resultsResult.success) {
    for (const r of resultsResult.data) {
      if (r.result_type !== "dimension" || r.segment_type !== "global") continue;
      const meta = r.metadata as {
        wave_comparison?: {
          delta: number;
          welch: { p_value: number; significant: boolean } | null;
          effect_size: { d: number; label: string };
        };
      };
      if (meta?.wave_comparison && r.dimension_code) {
        waveSignificance[r.dimension_code] = {
          p_value: meta.wave_comparison.welch?.p_value ?? 1.0,
          delta: meta.wave_comparison.delta,
          effect_label: meta.wave_comparison.effect_size.label,
        };
      }
    }
  }

  return (
    <TrendsClient
      campaignId={id}
      organizationId={campaignResult.data.organization_id}
      campaigns={trends.campaigns}
      series={trends.series}
      initialNarrative={trendsNarrative}
      waveSignificance={waveSignificance}
    />
  );
}

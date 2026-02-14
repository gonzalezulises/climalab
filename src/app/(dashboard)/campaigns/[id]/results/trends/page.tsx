import { notFound } from "next/navigation";
import { getCampaign } from "@/actions/campaigns";
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

  const narrativeResult = await getTrendsNarrative(id);
  const trendsNarrative = narrativeResult.success ? narrativeResult.data : null;

  return (
    <TrendsClient
      campaignId={id}
      organizationId={campaignResult.data.organization_id}
      campaigns={trends.campaigns}
      series={trends.series}
      initialNarrative={trendsNarrative}
    />
  );
}

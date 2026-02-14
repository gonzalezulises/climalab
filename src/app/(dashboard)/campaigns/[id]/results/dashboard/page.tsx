import { notFound } from "next/navigation";
import { getCampaign, getCampaigns, getCampaignResults } from "@/actions/campaigns";
import { getAlerts, getCategoryScores } from "@/actions/analytics";
import { getBusinessIndicators } from "@/actions/business-indicators";
import { getDashboardNarrative } from "@/actions/ai-insights";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [
    campaignResult,
    resultsResult,
    alertsResult,
    categoriesResult,
    indicatorsResult,
    narrativeResult,
  ] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
    getAlerts(id),
    getCategoryScores(id),
    getBusinessIndicators(id),
    getDashboardNarrative(id),
  ]);

  if (!campaignResult.success) notFound();

  const campaign = campaignResult.data;
  const results = resultsResult.success ? resultsResult.data : [];
  const alerts = alertsResult.success ? alertsResult.data : [];
  const categories = categoriesResult.success ? categoriesResult.data : [];
  const indicators = indicatorsResult.success ? indicatorsResult.data : [];
  const narrative = narrativeResult.success ? narrativeResult.data : null;

  // Extract dimension results (global)
  const dimensionResults = results
    .filter((r) => r.result_type === "dimension" && r.segment_type === "global")
    .map((r) => ({
      code: r.dimension_code!,
      name: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code!,
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }))
    .sort((a, b) => b.avg - a.avg);

  // Engagement result
  const engResult = results.find((r) => r.result_type === "engagement");
  const engScore = engResult ? Number(engResult.avg_score) : 0;
  const profiles = engResult
    ? (
        engResult.metadata as {
          profiles: {
            ambassadors: { count: number; pct: number };
            committed: { count: number; pct: number };
            neutral: { count: number; pct: number };
            disengaged: { count: number; pct: number };
          };
        }
      ).profiles
    : null;

  // eNPS result
  const enpsResult = results.find((r) => r.result_type === "enps");
  const enpsScore = enpsResult ? Number(enpsResult.avg_score) : 0;

  // Global favorability
  const globalFav =
    dimensionResults.length > 0
      ? Math.round(
          (dimensionResults.reduce((s, d) => s + d.fav, 0) / dimensionResults.length) * 10
        ) / 10
      : 0;

  // Get previous campaigns for wave comparison
  const allCampaigns = await getCampaigns(campaign.organization_id);
  const previousCampaigns = allCampaigns.success
    ? allCampaigns.data
        .filter((c) => c.id !== id && (c.status === "closed" || c.status === "archived"))
        .map((c) => ({ id: c.id, name: c.name }))
    : [];

  return (
    <DashboardClient
      campaignId={id}
      engScore={engScore}
      globalFav={globalFav}
      enpsScore={enpsScore}
      responseRate={Number(campaign.response_rate ?? 0)}
      sampleN={campaign.sample_n ?? 0}
      populationN={campaign.population_n ?? 0}
      dimensionResults={dimensionResults}
      profiles={profiles}
      alerts={alerts.slice(0, 5)}
      categories={categories}
      indicators={indicators}
      previousCampaigns={previousCampaigns}
      initialNarrative={narrative}
    />
  );
}

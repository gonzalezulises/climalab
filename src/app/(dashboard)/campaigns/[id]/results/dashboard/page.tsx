import { notFound } from "next/navigation";
import { getCampaign, getCampaigns, getCampaignResults } from "@/actions/campaigns";
import { getAlerts, getCategoryScores } from "@/actions/analytics";
import { getBusinessIndicators } from "@/actions/business-indicators";
import { getDashboardNarrative } from "@/actions/ai-insights";
import { DashboardClient } from "./dashboard-client";
import { SEGMENT_TYPE_LABELS } from "@/lib/constants";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ segment_type?: string; segment_key?: string }>;
}) {
  const { id } = await params;
  const { segment_type, segment_key } = await searchParams;

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

  // Determine which segment to use for dimension results
  const hasSegmentFilter = segment_type && segment_key;
  const segType = hasSegmentFilter ? segment_type : "global";
  const segKey = hasSegmentFilter ? segment_key : undefined;

  // Extract dimension results (filtered or global)
  const dimensionResults = results
    .filter(
      (r) =>
        r.result_type === "dimension" &&
        r.segment_type === segType &&
        (segKey ? r.segment_key === segKey : true)
    )
    .map((r) => ({
      code: r.dimension_code!,
      name: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code!,
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }))
    .sort((a, b) => b.avg - a.avg);

  // Engagement and eNPS always global
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

  const enpsResult = results.find((r) => r.result_type === "enps");
  const enpsScore = enpsResult ? Number(enpsResult.avg_score) : 0;

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

  // Build segment filter label
  const segmentLabel = hasSegmentFilter
    ? `${SEGMENT_TYPE_LABELS[segment_type] ?? segment_type}: ${segment_key}`
    : null;

  return (
    <>
      {segmentLabel && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Mostrando dimensiones para <strong>{segmentLabel}</strong>. Engagement, eNPS y perfiles
          son datos globales.
        </div>
      )}
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
    </>
  );
}

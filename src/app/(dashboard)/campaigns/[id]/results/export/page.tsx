import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import {
  getDashboardNarrative,
  getCommentAnalysis,
  getDriverInsights,
} from "@/actions/ai-insights";
import { ExportClient } from "./export-client";

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, resultsResult, narrativeResult, commentResult, driverResult] =
    await Promise.all([
      getCampaign(id),
      getCampaignResults(id),
      getDashboardNarrative(id),
      getCommentAnalysis(id),
      getDriverInsights(id),
    ]);

  if (!campaignResult.success) notFound();

  const results = resultsResult.success ? resultsResult.data : [];

  // Prepare dimension data for CSV
  const dimensionData = results
    .filter((r) => r.result_type === "dimension" && r.segment_type === "global")
    .map((r) => ({
      dimension_code: r.dimension_code,
      dimension_name:
        (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code,
      avg_score: r.avg_score,
      std_score: r.std_score,
      favorability_pct: r.favorability_pct,
      respondent_count: r.respondent_count,
    }));

  return (
    <ExportClient
      campaignId={id}
      campaignName={campaignResult.data.name}
      dimensionData={dimensionData}
      allResults={results}
      initialNarrative={narrativeResult.success ? narrativeResult.data : null}
      initialCommentAnalysis={commentResult.success ? commentResult.data : null}
      initialDriverInsights={driverResult.success ? driverResult.data : null}
    />
  );
}

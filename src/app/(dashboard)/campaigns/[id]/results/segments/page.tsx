import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getHeatmapData } from "@/actions/analytics";
import { SegmentsClient } from "./segments-client";

export default async function SegmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, resultsResult, heatmapResult] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
    getHeatmapData(id),
  ]);

  if (!campaignResult.success) notFound();

  const results = resultsResult.success ? resultsResult.data : [];
  const heatmapData = heatmapResult.success ? heatmapResult.data : [];

  // Get global ENG score for reference
  const engGlobal = results.find((r) => r.result_type === "dimension" && r.dimension_code === "ENG" && r.segment_type === "global");
  const globalEngScore = engGlobal ? Number(engGlobal.avg_score) : 0;

  // Build dimension code list from global results
  const dimensionCodes = results
    .filter((r) => r.result_type === "dimension" && r.segment_type === "global")
    .map((r) => r.dimension_code!)
    .filter(Boolean);

  return (
    <SegmentsClient
      heatmapData={heatmapData}
      dimensionCodes={dimensionCodes}
      globalEngScore={globalEngScore}
    />
  );
}

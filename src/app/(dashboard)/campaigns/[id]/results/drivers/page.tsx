import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getEngagementDrivers, getCorrelationMatrix } from "@/actions/analytics";
import { getDriverInsights } from "@/actions/ai-insights";
import { DriversClient } from "./drivers-client";

export default async function DriversPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, driversResult, matrixResult, resultsResult, insightsResult] = await Promise.all([
    getCampaign(id),
    getEngagementDrivers(id),
    getCorrelationMatrix(id),
    getCampaignResults(id),
    getDriverInsights(id),
  ]);

  if (!campaignResult.success) notFound();

  const drivers = driversResult.success ? driversResult.data : [];
  const matrix = matrixResult.success ? matrixResult.data : {};
  const results = resultsResult.success ? resultsResult.data : [];

  // Get dimension scores for the insight
  const dimScores = new Map<string, number>();
  for (const r of results) {
    if (r.result_type === "dimension" && r.segment_type === "global" && r.dimension_code) {
      dimScores.set(r.dimension_code, Number(r.avg_score));
    }
  }

  const dimensionCodes = [...dimScores.keys()];

  const insights = insightsResult.success ? insightsResult.data : null;

  return (
    <DriversClient
      campaignId={id}
      drivers={drivers}
      matrix={matrix}
      dimensionCodes={dimensionCodes}
      dimScores={Object.fromEntries(dimScores)}
      initialInsights={insights}
    />
  );
}

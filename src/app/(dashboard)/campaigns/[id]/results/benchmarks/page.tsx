import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getBenchmarkData } from "@/actions/analytics";
import { BenchmarksClient } from "./benchmarks-client";

export default async function BenchmarksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, benchmarkResult, resultsResult] = await Promise.all([
    getCampaign(id),
    getBenchmarkData(id),
    getCampaignResults(id),
  ]);
  if (!campaignResult.success) notFound();

  const benchmark = benchmarkResult.success ? benchmarkResult.data : null;

  // Build dimension name map from global results
  const results = resultsResult.success ? resultsResult.data : [];
  const dimensionNames: Record<string, string> = {};
  for (const r of results) {
    if (r.result_type === "dimension" && r.segment_type === "global" && r.dimension_code) {
      dimensionNames[r.dimension_code] =
        (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code;
    }
  }

  if (!benchmark || benchmark.overallRanking.length < 2) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Benchmarks Internos</h1>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Se necesitan al menos 2 departamentos con 5+ respondientes para generar benchmarks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BenchmarksClient
      overallRanking={benchmark.overallRanking}
      dimensionGaps={benchmark.dimensionGaps}
      heatmapData={benchmark.heatmapData}
      dimensionNames={dimensionNames}
    />
  );
}

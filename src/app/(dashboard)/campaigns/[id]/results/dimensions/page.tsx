import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getCategoryScores } from "@/actions/analytics";
import { DimensionsClient } from "./dimensions-client";
import { SEGMENT_TYPE_LABELS } from "@/lib/constants";

// Map dimension codes to categories (matches seed)
const dimCategory: Record<string, string> = {
  ORG: "bienestar",
  PRO: "bienestar",
  SEG: "bienestar",
  BAL: "bienestar",
  CUI: "bienestar",
  DEM: "bienestar",
  LID: "direccion",
  AUT: "direccion",
  COM: "direccion",
  CON: "direccion",
  ROL: "direccion",
  CMP: "compensacion",
  REC: "compensacion",
  BEN: "compensacion",
  EQA: "compensacion",
  NDI: "compensacion",
  COH: "cultura",
  INN: "cultura",
  RES: "cultura",
  DES: "cultura",
  APR: "cultura",
  ENG: "engagement",
  CAM: "modulos",
  CLI: "modulos",
  DIG: "modulos",
};

export default async function DimensionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ segment_type?: string; segment_key?: string }>;
}) {
  const { id } = await params;
  const { segment_type, segment_key } = await searchParams;
  const [campaignResult, resultsResult, categoriesResult] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
    getCategoryScores(id),
  ]);
  if (!campaignResult.success) notFound();

  const results = resultsResult.success ? resultsResult.data : [];
  const categories = categoriesResult.success ? categoriesResult.data : [];

  const hasSegmentFilter = segment_type && segment_key;
  const segType = hasSegmentFilter ? segment_type : "global";
  const segKey = hasSegmentFilter ? segment_key : undefined;

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
      std: Number(r.std_score),
      n: r.respondent_count ?? 0,
      category: dimCategory[r.dimension_code!] ?? "otro",
    }));

  // Items are always global (no per-segment items)
  const itemResults = results
    .filter((r) => r.result_type === "item" && r.segment_type === "global")
    .map((r) => ({
      id: r.segment_key!,
      code: r.dimension_code!,
      text: (r.metadata as { item_text?: string })?.item_text ?? "",
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }));

  const segmentLabel = hasSegmentFilter
    ? `${SEGMENT_TYPE_LABELS[segment_type] ?? segment_type}: ${segment_key}`
    : null;

  return (
    <>
      {segmentLabel && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Mostrando scores de dimensiones para <strong>{segmentLabel}</strong>. Los ítems muestran
          datos globales.
        </div>
      )}
      <DimensionsClient
        dimensionResults={dimensionResults}
        itemResults={itemResults}
        categories={categories}
      />
    </>
  );
}

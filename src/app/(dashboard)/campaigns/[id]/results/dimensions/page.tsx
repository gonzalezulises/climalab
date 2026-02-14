import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getCategoryScores } from "@/actions/analytics";
import { DimensionsClient } from "./dimensions-client";

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
};

export default async function DimensionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, resultsResult, categoriesResult] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
    getCategoryScores(id),
  ]);
  if (!campaignResult.success) notFound();

  const results = resultsResult.success ? resultsResult.data : [];
  const categories = categoriesResult.success ? categoriesResult.data : [];

  const dimensionResults = results
    .filter((r) => r.result_type === "dimension" && r.segment_type === "global")
    .map((r) => ({
      code: r.dimension_code!,
      name: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code!,
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
      std: Number(r.std_score),
      n: r.respondent_count ?? 0,
      category: dimCategory[r.dimension_code!] ?? "otro",
    }));

  const itemResults = results
    .filter((r) => r.result_type === "item" && r.segment_type === "global")
    .map((r) => ({
      id: r.segment_key!,
      code: r.dimension_code!,
      text: (r.metadata as { item_text?: string })?.item_text ?? "",
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }));

  return (
    <DimensionsClient
      dimensionResults={dimensionResults}
      itemResults={itemResults}
      categories={categories}
    />
  );
}

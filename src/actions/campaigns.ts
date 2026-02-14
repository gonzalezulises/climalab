"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createCampaignSchema,
  updateCampaignStatusSchema,
  generateLinksSchema,
  type CreateCampaignInput,
  type UpdateCampaignStatusInput,
  type GenerateLinksInput,
} from "@/lib/validations/campaign";
import type { ActionResult, Campaign, CampaignResult, Respondent } from "@/types";
import type { Json } from "@/types/database";

// ---------------------------------------------------------------------------
// getCampaigns — list campaigns with basic stats
// ---------------------------------------------------------------------------
export async function getCampaigns(
  orgId?: string
): Promise<ActionResult<Campaign[]>> {
  const supabase = await createClient();

  let query = supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// getCampaign — single campaign detail
// ---------------------------------------------------------------------------
export async function getCampaign(
  id: string
): Promise<ActionResult<Campaign>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// createCampaign
// ---------------------------------------------------------------------------
export async function createCampaign(
  input: CreateCampaignInput
): Promise<ActionResult<Campaign>> {
  const parsed = createCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/campaigns");
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// updateCampaignStatus — draft->active, active->closed, etc.
// ---------------------------------------------------------------------------
export async function updateCampaignStatus(
  input: UpdateCampaignStatusInput
): Promise<ActionResult<Campaign>> {
  const parsed = updateCampaignStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${parsed.data.id}`);
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// generateRespondentLinks
// ---------------------------------------------------------------------------
export async function generateRespondentLinks(
  input: GenerateLinksInput
): Promise<ActionResult<Respondent[]>> {
  const parsed = generateLinksSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const rows = Array.from({ length: parsed.data.count }, () => ({
    campaign_id: parsed.data.campaign_id,
  }));

  const { data, error } = await supabase
    .from("respondents")
    .insert(rows)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/campaigns/${parsed.data.campaign_id}`);
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// getRespondents — list respondents for a campaign
// ---------------------------------------------------------------------------
export async function getRespondents(
  campaignId: string
): Promise<ActionResult<Respondent[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("respondents")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// getCampaignResults
// ---------------------------------------------------------------------------
export async function getCampaignResults(
  campaignId: string
): Promise<ActionResult<CampaignResult[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_results")
    .select("*")
    .eq("campaign_id", campaignId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// getOpenResponses — anonymous open comments for a campaign
// ---------------------------------------------------------------------------
export async function getOpenResponses(
  campaignId: string
): Promise<ActionResult<{ question_type: string; text: string }[]>> {
  const supabase = await createClient();

  const { data: respondents } = await supabase
    .from("respondents")
    .select("id")
    .eq("campaign_id", campaignId)
    .in("status", ["completed"]);

  if (!respondents || respondents.length === 0) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase
    .from("open_responses")
    .select("question_type, text")
    .in("respondent_id", respondents.map((r) => r.id))
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}

// ---------------------------------------------------------------------------
// compareCampaigns — wave-over-wave dimension comparison
// ---------------------------------------------------------------------------
export async function compareCampaigns(
  currentId: string,
  previousId: string
): Promise<ActionResult<{
  current: { code: string; name: string; avg: number; fav: number }[];
  previous: { code: string; name: string; avg: number; fav: number }[];
}>> {
  const supabase = await createClient();

  const [currentResults, previousResults] = await Promise.all([
    supabase
      .from("campaign_results")
      .select("*")
      .eq("campaign_id", currentId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
    supabase
      .from("campaign_results")
      .select("*")
      .eq("campaign_id", previousId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
  ]);

  if (currentResults.error || previousResults.error) {
    return { success: false, error: "Error obteniendo resultados" };
  }

  const mapResults = (data: typeof currentResults.data) =>
    (data ?? []).map((r) => ({
      code: r.dimension_code!,
      name: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code!,
      avg: r.avg_score ?? 0,
      fav: r.favorability_pct ?? 0,
    }));

  return {
    success: true,
    data: {
      current: mapResults(currentResults.data),
      previous: mapResults(previousResults.data),
    },
  };
}

// ---------------------------------------------------------------------------
// calculateResults — the statistical calculation engine
// ---------------------------------------------------------------------------
export async function calculateResults(
  campaignId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  // 1. Fetch campaign + organization
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*, organizations(employee_count)")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    return { success: false, error: campaignError?.message ?? "Campaña no encontrada" };
  }

  // 2. Fetch instrument with dimensions and items
  const { data: dimensions, error: dimError } = await supabase
    .from("dimensions")
    .select("*, items(*)")
    .eq("instrument_id", campaign.instrument_id)
    .order("sort_order", { ascending: true });

  if (dimError || !dimensions) {
    return { success: false, error: dimError?.message ?? "Instrumento no encontrado" };
  }

  // Build lookup maps
  const itemMap = new Map<string, { dimension_code: string; is_reverse: boolean; is_attention_check: boolean }>();
  const attentionCheckItems: { id: string; expected_score: number }[] = [];

  for (const dim of dimensions) {
    for (const item of dim.items) {
      itemMap.set(item.id, {
        dimension_code: dim.code,
        is_reverse: item.is_reverse,
        is_attention_check: item.is_attention_check,
      });
      if (item.is_attention_check) {
        // Determine expected score from item text
        const text = item.text.toLowerCase();
        if (text.includes("de acuerdo") && !text.includes("en desacuerdo")) {
          attentionCheckItems.push({ id: item.id, expected_score: 4 }); // "De acuerdo"
        } else if (text.includes("en desacuerdo")) {
          attentionCheckItems.push({ id: item.id, expected_score: 2 }); // "En desacuerdo"
        }
      }
    }
  }

  // Build dimension name map
  const dimensionNameMap = new Map<string, string>();
  for (const dim of dimensions) {
    dimensionNameMap.set(dim.code, dim.name);
  }

  // 3. Fetch all respondents for the campaign
  const { data: respondents, error: respError } = await supabase
    .from("respondents")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "completed");

  if (respError) {
    return { success: false, error: respError.message };
  }

  if (!respondents || respondents.length === 0) {
    return { success: false, error: "No hay respuestas completadas" };
  }

  // 4. Fetch all responses
  const respondentIds = respondents.map((r) => r.id);
  const { data: allResponses, error: responseError } = await supabase
    .from("responses")
    .select("*")
    .in("respondent_id", respondentIds);

  if (responseError) {
    return { success: false, error: responseError.message };
  }

  // 5. Filter: disqualify respondents who failed attention checks
  const validRespondentIds = new Set<string>();
  const respondentResponseMap = new Map<string, Map<string, number>>();

  // Group responses by respondent
  for (const resp of allResponses ?? []) {
    if (!respondentResponseMap.has(resp.respondent_id)) {
      respondentResponseMap.set(resp.respondent_id, new Map());
    }
    respondentResponseMap.get(resp.respondent_id)!.set(resp.item_id, resp.score!);
  }

  // Check attention checks for each respondent
  for (const respondent of respondents) {
    const responses = respondentResponseMap.get(respondent.id);
    if (!responses) continue;

    let passedAll = true;
    for (const check of attentionCheckItems) {
      const score = responses.get(check.id);
      if (score !== check.expected_score) {
        passedAll = false;
        break;
      }
    }

    if (passedAll) {
      validRespondentIds.add(respondent.id);
    } else {
      // Mark as disqualified
      await supabase
        .from("respondents")
        .update({ status: "disqualified" })
        .eq("id", respondent.id);
    }
  }

  if (validRespondentIds.size === 0) {
    return { success: false, error: "Todos los respondentes fueron descalificados por fallar las verificaciones de atención" };
  }

  // 6. Build per-respondent, per-dimension adjusted scores
  type RespondentScores = {
    department: string | null;
    tenure: string | null;
    gender: string | null;
    dimensionScores: Map<string, number[]>;
    allScores: number[];
    enps?: number;
  };

  const respondentData = new Map<string, RespondentScores>();

  for (const respondent of respondents) {
    if (!validRespondentIds.has(respondent.id)) continue;

    const responses = respondentResponseMap.get(respondent.id);
    if (!responses) continue;

    const data: RespondentScores = {
      department: respondent.department,
      tenure: respondent.tenure,
      gender: respondent.gender,
      dimensionScores: new Map(),
      allScores: [],
    };

    for (const [itemId, score] of responses) {
      const itemInfo = itemMap.get(itemId);
      if (!itemInfo || itemInfo.is_attention_check) continue;

      // Invert reverse items: 6 - score
      const adjustedScore = itemInfo.is_reverse ? 6 - score : score;

      if (!data.dimensionScores.has(itemInfo.dimension_code)) {
        data.dimensionScores.set(itemInfo.dimension_code, []);
      }
      data.dimensionScores.get(itemInfo.dimension_code)!.push(adjustedScore);
      data.allScores.push(adjustedScore);
    }

    respondentData.set(respondent.id, data);
  }

  // 7. Helper functions
  function mean(arr: number[]): number {
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  function stdDev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  function favorability(arr: number[]): number {
    return (arr.filter((v) => v >= 4).length / arr.length) * 100;
  }

  // 8. Calculate dimension results (global + segments)
  const results: Array<{
    campaign_id: string;
    result_type: string;
    dimension_code: string | null;
    segment_key: string;
    segment_type: string;
    avg_score: number;
    std_score: number;
    favorability_pct: number;
    response_count: number;
    respondent_count: number;
    metadata: Json;
  }> = [];

  const dimensionCodes = dimensions
    .filter((d) => d.items.some((i) => !i.is_attention_check))
    .map((d) => d.code);

  // Global dimension results
  for (const code of dimensionCodes) {
    const allDimScores: number[] = [];
    let respondentCount = 0;

    for (const [, rd] of respondentData) {
      const scores = rd.dimensionScores.get(code);
      if (scores && scores.length > 0) {
        allDimScores.push(...scores);
        respondentCount++;
      }
    }

    if (allDimScores.length === 0) continue;

    results.push({
      campaign_id: campaignId,
      result_type: "dimension",
      dimension_code: code,
      segment_key: "global",
      segment_type: "global",
      avg_score: Math.round(mean(allDimScores) * 100) / 100,
      std_score: Math.round(stdDev(allDimScores) * 100) / 100,
      favorability_pct: Math.round(favorability(allDimScores) * 10) / 10,
      response_count: allDimScores.length,
      respondent_count: respondentCount,
      metadata: { dimension_name: dimensionNameMap.get(code) ?? code } as Json,
    });
  }

  // Segment dimension results (department, tenure, gender)
  const segmentTypes = ["department", "tenure", "gender"] as const;

  for (const segType of segmentTypes) {
    const segmentGroups = new Map<string, Map<string, number[]>>();
    const segmentRespondentCounts = new Map<string, Map<string, number>>();

    for (const [, rd] of respondentData) {
      const segValue = rd[segType];
      if (!segValue) continue;

      for (const code of dimensionCodes) {
        const scores = rd.dimensionScores.get(code);
        if (!scores || scores.length === 0) continue;

        if (!segmentGroups.has(segValue)) {
          segmentGroups.set(segValue, new Map());
          segmentRespondentCounts.set(segValue, new Map());
        }

        const group = segmentGroups.get(segValue)!;
        if (!group.has(code)) {
          group.set(code, []);
          segmentRespondentCounts.get(segValue)!.set(code, 0);
        }

        group.get(code)!.push(...scores);
        segmentRespondentCounts.get(segValue)!.set(
          code,
          (segmentRespondentCounts.get(segValue)!.get(code) ?? 0) + 1
        );
      }
    }

    for (const [segValue, dimScoresMap] of segmentGroups) {
      for (const [code, scores] of dimScoresMap) {
        const respondentCount = segmentRespondentCounts.get(segValue)?.get(code) ?? 0;
        // Skip segments with < 5 respondents for anonymity
        if (respondentCount < 5) continue;

        results.push({
          campaign_id: campaignId,
          result_type: "dimension",
          dimension_code: code,
          segment_key: segValue,
          segment_type: segType,
          avg_score: Math.round(mean(scores) * 100) / 100,
          std_score: Math.round(stdDev(scores) * 100) / 100,
          favorability_pct: Math.round(favorability(scores) * 10) / 10,
          response_count: scores.length,
          respondent_count: respondentCount,
          metadata: { dimension_name: dimensionNameMap.get(code) ?? code } as Json,
        });
      }
    }
  }

  // 9. Calculate per-item results (global)
  const itemScoresGlobal = new Map<string, { scores: number[]; respondentCount: number }>();

  for (const [respondentId, rd] of respondentData) {
    const responses = respondentResponseMap.get(respondentId);
    if (!responses) continue;

    for (const [itemId, rawScore] of responses) {
      const itemInfo = itemMap.get(itemId);
      if (!itemInfo || itemInfo.is_attention_check) continue;

      const adjustedScore = itemInfo.is_reverse ? 6 - rawScore : rawScore;

      if (!itemScoresGlobal.has(itemId)) {
        itemScoresGlobal.set(itemId, { scores: [], respondentCount: 0 });
      }
      const entry = itemScoresGlobal.get(itemId)!;
      entry.scores.push(adjustedScore);
      entry.respondentCount++;
    }
  }

  // Build item text lookup
  const itemTextMap = new Map<string, string>();
  for (const dim of dimensions) {
    for (const item of dim.items) {
      if (!item.is_attention_check) {
        itemTextMap.set(item.id, item.text);
      }
    }
  }

  for (const [itemId, data] of itemScoresGlobal) {
    const itemInfo = itemMap.get(itemId);
    if (!itemInfo) continue;

    results.push({
      campaign_id: campaignId,
      result_type: "item",
      dimension_code: itemInfo.dimension_code,
      segment_key: itemId,
      segment_type: "global",
      avg_score: Math.round(mean(data.scores) * 100) / 100,
      std_score: Math.round(stdDev(data.scores) * 100) / 100,
      favorability_pct: Math.round(favorability(data.scores) * 10) / 10,
      response_count: data.scores.length,
      respondent_count: data.respondentCount,
      metadata: {
        item_text: itemTextMap.get(itemId) ?? null,
        dimension_name: dimensionNameMap.get(itemInfo.dimension_code) ?? null,
      } as Json,
    });
  }

  // 10. Calculate engagement profiles
  const engagementScores: number[] = [];
  const profiles = { ambassadors: 0, committed: 0, neutral: 0, disengaged: 0 };

  for (const [, rd] of respondentData) {
    if (rd.allScores.length === 0) continue;
    const avgScore = mean(rd.allScores);
    engagementScores.push(avgScore);

    if (avgScore >= 4.5) profiles.ambassadors++;
    else if (avgScore >= 4.0) profiles.committed++;
    else if (avgScore >= 3.0) profiles.neutral++;
    else profiles.disengaged++;
  }

  if (engagementScores.length > 0) {
    const total = engagementScores.length;
    results.push({
      campaign_id: campaignId,
      result_type: "engagement",
      dimension_code: null,
      segment_key: "global",
      segment_type: "global",
      avg_score: Math.round(mean(engagementScores) * 100) / 100,
      std_score: Math.round(stdDev(engagementScores) * 100) / 100,
      favorability_pct: Math.round(favorability(engagementScores.map((s) => Math.round(s))) * 10) / 10,
      response_count: engagementScores.length,
      respondent_count: total,
      metadata: {
        profiles: {
          ambassadors: { count: profiles.ambassadors, pct: Math.round((profiles.ambassadors / total) * 1000) / 10 },
          committed: { count: profiles.committed, pct: Math.round((profiles.committed / total) * 1000) / 10 },
          neutral: { count: profiles.neutral, pct: Math.round((profiles.neutral / total) * 1000) / 10 },
          disengaged: { count: profiles.disengaged, pct: Math.round((profiles.disengaged / total) * 1000) / 10 },
        },
      } as Json,
    });
  }

  // 10b. Calculate eNPS
  const { data: enpsData } = await supabase
    .from("respondents")
    .select("enps_score")
    .eq("campaign_id", campaignId)
    .in("id", [...validRespondentIds])
    .not("enps_score", "is", null);

  if (enpsData && enpsData.length > 0) {
    const enpsScoresArr = enpsData.map((r) => r.enps_score!);
    const promoters = enpsScoresArr.filter((s) => s >= 9).length;
    const detractors = enpsScoresArr.filter((s) => s <= 6).length;
    const enpsTotal = enpsScoresArr.length;
    const enpsValue = Math.round(((promoters - detractors) / enpsTotal) * 100);

    results.push({
      campaign_id: campaignId,
      result_type: "enps",
      dimension_code: null,
      segment_key: "global",
      segment_type: "global",
      avg_score: enpsValue,
      std_score: 0,
      favorability_pct: Math.round((promoters / enpsTotal) * 1000) / 10,
      response_count: enpsTotal,
      respondent_count: enpsTotal,
      metadata: {
        promoters: { count: promoters, pct: Math.round((promoters / enpsTotal) * 1000) / 10 },
        passives: { count: enpsTotal - promoters - detractors, pct: Math.round(((enpsTotal - promoters - detractors) / enpsTotal) * 1000) / 10 },
        detractors: { count: detractors, pct: Math.round((detractors / enpsTotal) * 1000) / 10 },
      } as Json,
    });
  }

  // 11. Ficha técnica
  const org = campaign.organizations as unknown as { employee_count: number } | null;
  const populationN = org?.employee_count ?? 0;
  const sampleN = validRespondentIds.size;
  const responseRate = populationN > 0 ? Math.round((sampleN / populationN) * 10000) / 100 : 0;

  // Margin of error: 1.96 * sqrt(0.25 / n) * sqrt((N-n)/(N-1)) * 100
  let marginOfError = 0;
  if (sampleN > 0 && populationN > 1) {
    const fpcCorrection = Math.sqrt((populationN - sampleN) / (populationN - 1));
    marginOfError = Math.round(1.96 * Math.sqrt(0.25 / sampleN) * fpcCorrection * 100 * 100) / 100;
  }

  // Update campaign with ficha técnica
  await supabase
    .from("campaigns")
    .update({
      population_n: populationN,
      sample_n: sampleN,
      response_rate: responseRate,
      margin_of_error: marginOfError,
    })
    .eq("id", campaignId);

  // 13. Delete previous results and insert new ones
  await supabase
    .from("campaign_results")
    .delete()
    .eq("campaign_id", campaignId);

  // Insert in batches of 50
  for (let i = 0; i < results.length; i += 50) {
    const batch = results.slice(i, i + 50);
    const { error: insertError } = await supabase
      .from("campaign_results")
      .insert(batch);

    if (insertError) {
      return { success: false, error: `Error guardando resultados: ${insertError.message}` };
    }
  }

  // =========================================================================
  // 14. Advanced analytics → campaign_analytics table
  // =========================================================================

  // Delete previous analytics
  await supabase.from("campaign_analytics").delete().eq("campaign_id", campaignId);

  const analytics: Array<{ campaign_id: string; analysis_type: string; data: Json }> = [];

  // --- 14a. Pearson correlations between dimensions ---
  // Build per-respondent dimension averages
  const respondentDimAvgs = new Map<string, Map<string, number>>();
  for (const [rid, rd] of respondentData) {
    const dimAvgs = new Map<string, number>();
    for (const [code, scores] of rd.dimensionScores) {
      if (scores.length > 0) dimAvgs.set(code, mean(scores));
    }
    respondentDimAvgs.set(rid, dimAvgs);
  }

  function pearson(xArr: number[], yArr: number[]): { r: number; pValue: number; n: number } {
    const n = xArr.length;
    if (n < 10) return { r: 0, pValue: 1, n };
    const mx = mean(xArr);
    const my = mean(yArr);
    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = xArr[i] - mx;
      const dy = yArr[i] - my;
      sumXY += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }
    const denom = Math.sqrt(sumX2 * sumY2);
    if (denom === 0) return { r: 0, pValue: 1, n };
    const r = sumXY / denom;
    // t-test for significance
    const t = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10));
    // Approximate p-value using t-distribution (two-tailed, rough)
    const df = n - 2;
    const pValue = df > 0 ? Math.exp(-0.717 * Math.abs(t) - 0.416 * t * t / df) : 1;
    return { r: Math.round(r * 1000) / 1000, pValue: Math.round(pValue * 10000) / 10000, n };
  }

  // Correlation matrix
  const corrMatrix: Record<string, Record<string, { r: number; pValue: number; n: number }>> = {};
  for (const codeA of dimensionCodes) {
    corrMatrix[codeA] = {};
    for (const codeB of dimensionCodes) {
      if (codeA === codeB) {
        corrMatrix[codeA][codeB] = { r: 1, pValue: 0, n: respondentData.size };
        continue;
      }
      const xArr: number[] = [];
      const yArr: number[] = [];
      for (const [, dimAvgs] of respondentDimAvgs) {
        const x = dimAvgs.get(codeA);
        const y = dimAvgs.get(codeB);
        if (x !== undefined && y !== undefined) {
          xArr.push(x);
          yArr.push(y);
        }
      }
      corrMatrix[codeA][codeB] = pearson(xArr, yArr);
    }
  }

  analytics.push({
    campaign_id: campaignId,
    analysis_type: "correlation_matrix",
    data: corrMatrix as unknown as Json,
  });

  // Engagement drivers: correlation of each dimension with ENG
  const engDrivers: Array<{ code: string; name: string; r: number; pValue: number; n: number }> = [];
  for (const code of dimensionCodes) {
    if (code === "ENG") continue;
    const corr = corrMatrix[code]?.["ENG"];
    if (corr) {
      engDrivers.push({
        code,
        name: dimensionNameMap.get(code) ?? code,
        ...corr,
      });
    }
  }
  engDrivers.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  analytics.push({
    campaign_id: campaignId,
    analysis_type: "engagement_drivers",
    data: engDrivers as unknown as Json,
  });

  // --- 14b. Automatic alerts ---
  const alerts: Array<{
    severity: string;
    type: string;
    dimension_code?: string;
    item_id?: string;
    item_text?: string;
    segment_key?: string;
    value: number;
    threshold: number;
    message: string;
  }> = [];

  // Check item favorability
  for (const [itemId, data] of itemScoresGlobal) {
    const itemInfo = itemMap.get(itemId);
    if (!itemInfo) continue;
    const fav = favorability(data.scores);
    if (fav < 60) {
      alerts.push({
        severity: "crisis",
        type: "low_favorability",
        dimension_code: itemInfo.dimension_code,
        item_id: itemId,
        item_text: itemTextMap.get(itemId) ?? "",
        value: Math.round(fav * 10) / 10,
        threshold: 60,
        message: `Ítem con favorabilidad crítica (${Math.round(fav)}%) en ${dimensionNameMap.get(itemInfo.dimension_code) ?? itemInfo.dimension_code}`,
      });
    } else if (fav < 70) {
      alerts.push({
        severity: "attention",
        type: "low_favorability",
        dimension_code: itemInfo.dimension_code,
        item_id: itemId,
        item_text: itemTextMap.get(itemId) ?? "",
        value: Math.round(fav * 10) / 10,
        threshold: 70,
        message: `Ítem requiere atención (${Math.round(fav)}%) en ${dimensionNameMap.get(itemInfo.dimension_code) ?? itemInfo.dimension_code}`,
      });
    }
  }

  // Check segment engagement < 3.5
  for (const result of results) {
    if (result.result_type === "dimension" && result.dimension_code === "ENG" && result.segment_type !== "global") {
      if (result.avg_score < 3.5) {
        alerts.push({
          severity: "risk_group",
          type: "low_engagement_segment",
          segment_key: result.segment_key,
          dimension_code: "ENG",
          value: result.avg_score,
          threshold: 3.5,
          message: `Segmento "${result.segment_key}" con engagement bajo (${result.avg_score})`,
        });
      }
    }
  }

  alerts.sort((a, b) => {
    const sev = { crisis: 0, risk_group: 1, decline: 2, attention: 3 };
    return (sev[a.severity as keyof typeof sev] ?? 4) - (sev[b.severity as keyof typeof sev] ?? 4);
  });

  analytics.push({
    campaign_id: campaignId,
    analysis_type: "alerts",
    data: alerts as unknown as Json,
  });

  // --- 14c. Category scores ---
  const categoryMap: Record<string, string[]> = {};
  for (const dim of dimensions) {
    const cat = (dim as { category?: string }).category;
    if (!cat) continue;
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(dim.code);
  }

  const categoryScores: Array<{ category: string; avg_score: number; favorability_pct: number; dimension_count: number }> = [];
  for (const [cat, codes] of Object.entries(categoryMap)) {
    const allScores: number[] = [];
    for (const code of codes) {
      for (const [, rd] of respondentData) {
        const scores = rd.dimensionScores.get(code);
        if (scores) allScores.push(...scores);
      }
    }
    if (allScores.length > 0) {
      categoryScores.push({
        category: cat,
        avg_score: Math.round(mean(allScores) * 100) / 100,
        favorability_pct: Math.round(favorability(allScores) * 10) / 10,
        dimension_count: codes.length,
      });
    }
  }

  analytics.push({
    campaign_id: campaignId,
    analysis_type: "categories",
    data: categoryScores as unknown as Json,
  });

  // Insert analytics in batches
  for (let i = 0; i < analytics.length; i += 10) {
    const batch = analytics.slice(i, i + 10);
    await supabase.from("campaign_analytics").insert(batch);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/results`);

  return { success: true, data: undefined };
}

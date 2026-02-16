/**
 * Calculate results engine — refactored from scripts/seed-results.ts:processOneCampaign.
 * Fully standalone, same logic and statistical functions.
 */

import type { SupabaseClient } from "./supabase.js";
import {
  mean,
  stdDev as std,
  favorability as fav,
  rwg,
  cronbachAlpha,
  pearson,
} from "./statistics.js";

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface CalculateResultsOutput {
  validCount: number;
  disqualifiedCount: number;
  totalResults: number;
  totalAnalytics: number;
}

export async function calculateResults(
  supabase: SupabaseClient,
  campaignId: string
): Promise<CalculateResultsOutput> {
  // 1. Fetch campaign + org
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, organizations(employee_count)")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

  // 2. Fetch dimensions + items for base + modules
  const allInstrumentIds = [campaign.instrument_id, ...(campaign.module_instrument_ids ?? [])];
  const { data: dimensions } = await supabase
    .from("dimensions")
    .select("*, items(*)")
    .in("instrument_id", allInstrumentIds)
    .order("sort_order");

  if (!dimensions) throw new Error("Dimensions not found");

  // 3. Build maps
  const itemMap = new Map<
    string,
    {
      dimension_code: string;
      dimension_name: string;
      is_reverse: boolean;
      is_attention_check: boolean;
    }
  >();
  const attentionChecks: { id: string; expected: number }[] = [];
  const dimensionNameMap = new Map<string, string>();
  const itemTextMap = new Map<string, string>();

  for (const dim of dimensions) {
    dimensionNameMap.set(dim.code, dim.name);
    for (const item of dim.items) {
      itemMap.set(item.id, {
        dimension_code: dim.code,
        dimension_name: dim.name,
        is_reverse: item.is_reverse,
        is_attention_check: item.is_attention_check,
      });
      if (item.is_attention_check) {
        const text = item.text.toLowerCase();
        if (text.includes("de acuerdo") && !text.includes("en desacuerdo")) {
          attentionChecks.push({ id: item.id, expected: 4 });
        } else if (text.includes("en desacuerdo")) {
          attentionChecks.push({ id: item.id, expected: 2 });
        }
      } else {
        itemTextMap.set(item.id, item.text);
      }
    }
  }

  // 4. Fetch completed respondents
  const { data: respondents } = await supabase
    .from("respondents")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "completed");

  if (!respondents?.length) throw new Error("No completed respondents");

  const respondentIds = respondents.map((r) => r.id);

  // 5. Fetch responses in batches (small batches to stay under PostgREST 1000-row limit)
  // Each respondent has ~109 items, so batch by 8 → ~872 rows per query
  let allResponses: { respondent_id: string; item_id: string; score: number }[] = [];
  for (let i = 0; i < respondentIds.length; i += 8) {
    const batch = respondentIds.slice(i, i + 8);
    const { data } = await supabase
      .from("responses")
      .select("respondent_id, item_id, score")
      .in("respondent_id", batch)
      .limit(10000);
    if (data) allResponses = allResponses.concat(data);
  }

  // Group responses
  const respMap = new Map<string, Map<string, number>>();
  for (const resp of allResponses) {
    if (!respMap.has(resp.respondent_id)) respMap.set(resp.respondent_id, new Map());
    respMap.get(resp.respondent_id)!.set(resp.item_id, resp.score);
  }

  // 6. Validate attention checks
  const validIds = new Set<string>();
  let disqualifiedCount = 0;
  for (const r of respondents) {
    const responses = respMap.get(r.id);
    if (!responses) continue;
    let pass = true;
    for (const check of attentionChecks) {
      if (responses.get(check.id) !== check.expected) {
        pass = false;
        break;
      }
    }
    if (pass) {
      validIds.add(r.id);
    } else {
      disqualifiedCount++;
      await supabase.from("respondents").update({ status: "disqualified" }).eq("id", r.id);
    }
  }

  // 7. Build per-respondent dimension scores
  type RD = {
    department: string | null;
    tenure: string | null;
    gender: string | null;
    dimScores: Map<string, number[]>;
    allScores: number[];
  };
  const respondentData = new Map<string, RD>();

  for (const r of respondents) {
    if (!validIds.has(r.id)) continue;
    const responses = respMap.get(r.id)!;
    const rd: RD = {
      department: r.department,
      tenure: r.tenure,
      gender: r.gender,
      dimScores: new Map(),
      allScores: [],
    };
    for (const [itemId, score] of responses) {
      const info = itemMap.get(itemId);
      if (!info || info.is_attention_check) continue;
      const adj = info.is_reverse ? 6 - score : score;
      if (!rd.dimScores.has(info.dimension_code)) rd.dimScores.set(info.dimension_code, []);
      rd.dimScores.get(info.dimension_code)!.push(adj);
      rd.allScores.push(adj);
    }
    respondentData.set(r.id, rd);
  }

  const results: any[] = [];
  const dimCodes = dimensions
    .filter((d: any) => d.items.some((i: any) => !i.is_attention_check))
    .map((d: any) => d.code);

  // 8. Global dimension results
  for (const code of dimCodes) {
    const scores: number[] = [];
    const perRespMeans: number[] = [];
    let rc = 0;
    for (const [, rd] of respondentData) {
      const s = rd.dimScores.get(code);
      if (s?.length) {
        scores.push(...s);
        perRespMeans.push(mean(s));
        rc++;
      }
    }
    if (!scores.length) continue;
    results.push({
      campaign_id: campaignId,
      result_type: "dimension",
      dimension_code: code,
      segment_key: "global",
      segment_type: "global",
      avg_score: r2(mean(scores)),
      std_score: r2(std(scores)),
      favorability_pct: r1(fav(scores)),
      response_count: scores.length,
      respondent_count: rc,
      metadata: { dimension_name: dimensionNameMap.get(code), rwg: rwg(perRespMeans) },
    });
  }

  // 9. Segment results
  for (const segType of ["department", "tenure", "gender"] as const) {
    const groups = new Map<
      string,
      Map<string, { scores: number[]; rc: number; means: number[] }>
    >();
    for (const [, rd] of respondentData) {
      const seg = rd[segType];
      if (!seg) continue;
      for (const code of dimCodes) {
        const s = rd.dimScores.get(code);
        if (!s?.length) continue;
        if (!groups.has(seg)) groups.set(seg, new Map());
        const g = groups.get(seg)!;
        if (!g.has(code)) g.set(code, { scores: [], rc: 0, means: [] });
        const e = g.get(code)!;
        e.scores.push(...s);
        e.rc++;
        e.means.push(mean(s));
      }
    }
    for (const [seg, dimMap] of groups) {
      for (const [code, { scores, rc, means }] of dimMap) {
        if (rc < 5) continue; // Anonymity threshold
        results.push({
          campaign_id: campaignId,
          result_type: "dimension",
          dimension_code: code,
          segment_key: seg,
          segment_type: segType,
          avg_score: r2(mean(scores)),
          std_score: r2(std(scores)),
          favorability_pct: r1(fav(scores)),
          response_count: scores.length,
          respondent_count: rc,
          metadata: { dimension_name: dimensionNameMap.get(code), rwg: rwg(means) },
        });
      }
    }
  }

  // 10. Item results
  const itemScores = new Map<string, { scores: number[]; rc: number }>();
  for (const [rid] of respondentData) {
    const responses = respMap.get(rid)!;
    for (const [itemId, score] of responses) {
      const info = itemMap.get(itemId);
      if (!info || info.is_attention_check) continue;
      const adj = info.is_reverse ? 6 - score : score;
      if (!itemScores.has(itemId)) itemScores.set(itemId, { scores: [], rc: 0 });
      const e = itemScores.get(itemId)!;
      e.scores.push(adj);
      e.rc++;
    }
  }

  for (const [itemId, { scores, rc }] of itemScores) {
    const info = itemMap.get(itemId)!;
    results.push({
      campaign_id: campaignId,
      result_type: "item",
      dimension_code: info.dimension_code,
      segment_key: itemId,
      segment_type: "global",
      avg_score: r2(mean(scores)),
      std_score: r2(std(scores)),
      favorability_pct: r1(fav(scores)),
      response_count: scores.length,
      respondent_count: rc,
      metadata: { item_text: itemTextMap.get(itemId), dimension_name: info.dimension_name },
    });
  }

  // 11. Engagement profiles
  const engScores: number[] = [];
  const profiles = { ambassadors: 0, committed: 0, neutral: 0, disengaged: 0 };
  for (const [, rd] of respondentData) {
    if (!rd.allScores.length) continue;
    const avg = mean(rd.allScores);
    engScores.push(avg);
    if (avg >= 4.5) profiles.ambassadors++;
    else if (avg >= 4.0) profiles.committed++;
    else if (avg >= 3.0) profiles.neutral++;
    else profiles.disengaged++;
  }
  const total = engScores.length;
  results.push({
    campaign_id: campaignId,
    result_type: "engagement",
    dimension_code: null,
    segment_key: "global",
    segment_type: "global",
    avg_score: r2(mean(engScores)),
    std_score: r2(std(engScores)),
    favorability_pct: r1(fav(engScores.map(Math.round))),
    response_count: total,
    respondent_count: total,
    metadata: {
      profiles: {
        ambassadors: { count: profiles.ambassadors, pct: r1((profiles.ambassadors / total) * 100) },
        committed: { count: profiles.committed, pct: r1((profiles.committed / total) * 100) },
        neutral: { count: profiles.neutral, pct: r1((profiles.neutral / total) * 100) },
        disengaged: { count: profiles.disengaged, pct: r1((profiles.disengaged / total) * 100) },
      },
    },
  });

  // 12. eNPS
  const { data: enpsData } = await supabase
    .from("respondents")
    .select("enps_score")
    .eq("campaign_id", campaignId)
    .in("id", [...validIds])
    .not("enps_score", "is", null);

  if (enpsData?.length) {
    const enpsArr = enpsData.map((r) => r.enps_score!);
    const prom = enpsArr.filter((s: number) => s >= 9).length;
    const det = enpsArr.filter((s: number) => s <= 6).length;
    const t = enpsArr.length;
    results.push({
      campaign_id: campaignId,
      result_type: "enps",
      dimension_code: null,
      segment_key: "global",
      segment_type: "global",
      avg_score: Math.round(((prom - det) / t) * 100),
      std_score: 0,
      favorability_pct: r1((prom / t) * 100),
      response_count: t,
      respondent_count: t,
      metadata: {
        promoters: { count: prom, pct: r1((prom / t) * 100) },
        passives: { count: t - prom - det, pct: r1(((t - prom - det) / t) * 100) },
        detractors: { count: det, pct: r1((det / t) * 100) },
      },
    });
  }

  // 13. Ficha tecnica
  const org = campaign.organizations as any;
  const N = org?.employee_count ?? 0;
  const n = validIds.size;
  const rr = N > 0 ? r2((n / N) * 100) : 0;
  const me =
    n > 0 && N > 1 ? r2(1.96 * Math.sqrt(0.25 / n) * Math.sqrt((N - n) / (N - 1)) * 100) : 0;
  await supabase
    .from("campaigns")
    .update({ population_n: N, sample_n: n, response_rate: rr, margin_of_error: me })
    .eq("id", campaignId);

  // 14. Insert results
  await supabase.from("campaign_results").delete().eq("campaign_id", campaignId);
  for (let i = 0; i < results.length; i += 50) {
    const { error } = await supabase.from("campaign_results").insert(results.slice(i, i + 50));
    if (error) throw new Error(`Insert campaign_results error: ${error.message}`);
  }

  // =========================================================================
  // Advanced analytics → campaign_analytics
  // =========================================================================
  await supabase.from("campaign_analytics").delete().eq("campaign_id", campaignId);
  const analytics: any[] = [];

  // Per-respondent dimension averages
  const respondentDimAvgs = new Map<string, Map<string, number>>();
  for (const [rid, rd] of respondentData) {
    const avgs = new Map<string, number>();
    for (const [code, scores] of rd.dimScores) {
      if (scores.length > 0) avgs.set(code, mean(scores));
    }
    respondentDimAvgs.set(rid, avgs);
  }

  // Correlation matrix
  const corrMatrix: any = {};
  for (const codeA of dimCodes) {
    corrMatrix[codeA] = {};
    for (const codeB of dimCodes) {
      if (codeA === codeB) {
        corrMatrix[codeA][codeB] = { r: 1, pValue: 0, n: respondentData.size };
        continue;
      }
      const xArr: number[] = [],
        yArr: number[] = [];
      for (const [, avgs] of respondentDimAvgs) {
        const x = avgs.get(codeA),
          y = avgs.get(codeB);
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
    data: corrMatrix,
  });

  // Engagement drivers
  const engDrivers = dimCodes
    .filter((c: string) => c !== "ENG")
    .map((code: string) => ({
      code,
      name: dimensionNameMap.get(code) ?? code,
      ...corrMatrix[code]?.["ENG"],
    }))
    .sort((a: any, b: any) => Math.abs(b.r) - Math.abs(a.r));
  analytics.push({
    campaign_id: campaignId,
    analysis_type: "engagement_drivers",
    data: engDrivers,
  });

  // Alerts
  const alerts: any[] = [];
  for (const [itemId, data] of itemScores) {
    const info = itemMap.get(itemId);
    if (!info) continue;
    const f = fav(data.scores);
    if (f < 60) {
      alerts.push({
        severity: "crisis",
        type: "low_favorability",
        dimension_code: info.dimension_code,
        item_id: itemId,
        item_text: itemTextMap.get(itemId),
        value: r1(f),
        threshold: 60,
        message: `Ítem con favorabilidad crítica (${Math.round(f)}%) en ${info.dimension_name}`,
      });
    } else if (f < 70) {
      alerts.push({
        severity: "attention",
        type: "low_favorability",
        dimension_code: info.dimension_code,
        item_id: itemId,
        item_text: itemTextMap.get(itemId),
        value: r1(f),
        threshold: 70,
        message: `Ítem requiere atención (${Math.round(f)}%) en ${info.dimension_name}`,
      });
    }
  }

  // Risk groups
  for (const result of results) {
    if (
      result.result_type === "dimension" &&
      result.dimension_code === "ENG" &&
      result.segment_type !== "global"
    ) {
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
  alerts.sort((a: any, b: any) => {
    const sev: Record<string, number> = { crisis: 0, risk_group: 1, decline: 2, attention: 3 };
    return (sev[a.severity] ?? 4) - (sev[b.severity] ?? 4);
  });
  analytics.push({ campaign_id: campaignId, analysis_type: "alerts", data: alerts });

  // Category scores
  const categoryMap: Record<string, string[]> = {};
  for (const dim of dimensions) {
    const cat = (dim as any).category as string | null;
    if (!cat) continue;
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(dim.code);
  }
  const categoryScores = Object.entries(categoryMap).map(([cat, codes]) => {
    const allScores: number[] = [];
    for (const code of codes) {
      for (const [, rd] of respondentData) {
        const s = rd.dimScores.get(code);
        if (s) allScores.push(...s);
      }
    }
    return {
      category: cat,
      avg_score: r2(mean(allScores)),
      favorability_pct: r1(fav(allScores)),
      dimension_count: codes.length,
    };
  });
  analytics.push({ campaign_id: campaignId, analysis_type: "categories", data: categoryScores });

  // Reliability (Cronbach's alpha)
  const reliabilityData: any[] = [];
  for (const dim of dimensions) {
    const dimItems = (dim as any).items.filter((i: any) => !i.is_attention_check);
    if (dimItems.length < 2) continue;
    const matrix: number[][] = [];
    for (const [rid] of respondentData) {
      const responses = respMap.get(rid)!;
      const row: number[] = [];
      let complete = true;
      for (const item of dimItems) {
        const raw = responses.get(item.id);
        if (raw === undefined) {
          complete = false;
          break;
        }
        const info = itemMap.get(item.id);
        row.push(info?.is_reverse ? 6 - raw : raw);
      }
      if (complete) matrix.push(row);
    }
    reliabilityData.push({
      dimension_code: dim.code,
      dimension_name: dim.name,
      alpha: cronbachAlpha(matrix),
      item_count: dimItems.length,
      respondent_count: matrix.length,
    });
  }
  analytics.push({ campaign_id: campaignId, analysis_type: "reliability", data: reliabilityData });

  // Insert analytics
  for (const a of analytics) {
    const { error } = await supabase.from("campaign_analytics").insert(a);
    if (error) throw new Error(`Analytics insert error: ${error.message}`);
  }

  return {
    validCount: validIds.size,
    disqualifiedCount,
    totalResults: results.length,
    totalAnalytics: analytics.length,
  };
}

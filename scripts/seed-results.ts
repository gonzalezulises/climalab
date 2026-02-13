/**
 * Post-seed script: calcula resultados de la campaña demo.
 * Ejecutar después de `supabase db reset`:
 *   npm run seed:results
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function main() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const campaignId = "e0000000-0000-0000-0000-000000000001";

  // Fetch campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, organizations(employee_count)")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    console.error("Demo campaign not found");
    process.exit(1);
  }

  // Fetch dimensions + items
  const { data: dimensions } = await supabase
    .from("dimensions")
    .select("*, items(*)")
    .eq("instrument_id", campaign.instrument_id)
    .order("sort_order");

  if (!dimensions) {
    console.error("Dimensions not found");
    process.exit(1);
  }

  // Build maps
  const itemMap = new Map<string, { dimension_code: string; dimension_name: string; is_reverse: boolean; is_attention_check: boolean }>();
  const attentionChecks: { id: string; expected: number }[] = [];
  const dimensionNameMap = new Map<string, string>();

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
      }
    }
  }

  // Fetch respondents + responses
  const { data: respondents } = await supabase
    .from("respondents")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "completed");

  const respondentIds = respondents!.map((r) => r.id);
  const { data: allResponses } = await supabase
    .from("responses")
    .select("*")
    .in("respondent_id", respondentIds);

  // Group responses by respondent
  const respMap = new Map<string, Map<string, number>>();
  for (const resp of allResponses!) {
    if (!respMap.has(resp.respondent_id)) respMap.set(resp.respondent_id, new Map());
    respMap.get(resp.respondent_id)!.set(resp.item_id, resp.score!);
  }

  // Validate attention checks
  const validIds = new Set<string>();
  for (const r of respondents!) {
    const responses = respMap.get(r.id);
    if (!responses) continue;
    let pass = true;
    for (const check of attentionChecks) {
      if (responses.get(check.id) !== check.expected) { pass = false; break; }
    }
    if (pass) validIds.add(r.id);
    else {
      await supabase.from("respondents").update({ status: "disqualified" }).eq("id", r.id);
    }
  }

  console.log(`Valid respondents: ${validIds.size} / ${respondents!.length}`);

  // Build dimension scores per respondent
  type RD = { department: string | null; tenure: string | null; gender: string | null; dimScores: Map<string, number[]>; allScores: number[] };
  const respondentData = new Map<string, RD>();

  for (const r of respondents!) {
    if (!validIds.has(r.id)) continue;
    const responses = respMap.get(r.id)!;
    const rd: RD = { department: r.department, tenure: r.tenure, gender: r.gender, dimScores: new Map(), allScores: [] };
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

  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const std = (a: number[]) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
  const fav = (a: number[]) => (a.filter((v) => v >= 4).length / a.length) * 100;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const r1 = (n: number) => Math.round(n * 10) / 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  const dimCodes = dimensions.filter((d) => d.items.some((i: { is_attention_check: boolean }) => !i.is_attention_check)).map((d) => d.code);

  // Global dimension results
  for (const code of dimCodes) {
    const scores: number[] = [];
    let rc = 0;
    for (const [, rd] of respondentData) {
      const s = rd.dimScores.get(code);
      if (s?.length) { scores.push(...s); rc++; }
    }
    if (!scores.length) continue;
    results.push({ campaign_id: campaignId, result_type: "dimension", dimension_code: code, segment_key: "global", segment_type: "global", avg_score: r2(mean(scores)), std_score: r2(std(scores)), favorability_pct: r1(fav(scores)), response_count: scores.length, respondent_count: rc, metadata: { dimension_name: dimensionNameMap.get(code) } });
  }

  // Segment results
  for (const segType of ["department", "tenure", "gender"] as const) {
    const groups = new Map<string, Map<string, { scores: number[]; rc: number }>>();
    for (const [, rd] of respondentData) {
      const seg = rd[segType]; if (!seg) continue;
      for (const code of dimCodes) {
        const s = rd.dimScores.get(code); if (!s?.length) continue;
        if (!groups.has(seg)) groups.set(seg, new Map());
        const g = groups.get(seg)!;
        if (!g.has(code)) g.set(code, { scores: [], rc: 0 });
        const e = g.get(code)!; e.scores.push(...s); e.rc++;
      }
    }
    for (const [seg, dimMap] of groups) {
      for (const [code, { scores, rc }] of dimMap) {
        if (rc < 5) continue;
        results.push({ campaign_id: campaignId, result_type: "dimension", dimension_code: code, segment_key: seg, segment_type: segType, avg_score: r2(mean(scores)), std_score: r2(std(scores)), favorability_pct: r1(fav(scores)), response_count: scores.length, respondent_count: rc, metadata: { dimension_name: dimensionNameMap.get(code) } });
      }
    }
  }

  // Item results
  const itemScores = new Map<string, { scores: number[]; rc: number }>();
  for (const [rid] of respondentData) {
    const responses = respMap.get(rid)!;
    for (const [itemId, score] of responses) {
      const info = itemMap.get(itemId); if (!info || info.is_attention_check) continue;
      const adj = info.is_reverse ? 6 - score : score;
      if (!itemScores.has(itemId)) itemScores.set(itemId, { scores: [], rc: 0 });
      const e = itemScores.get(itemId)!; e.scores.push(adj); e.rc++;
    }
  }
  const itemTextMap = new Map<string, string>();
  for (const dim of dimensions) for (const item of dim.items) if (!item.is_attention_check) itemTextMap.set(item.id, item.text);

  for (const [itemId, { scores, rc }] of itemScores) {
    const info = itemMap.get(itemId)!;
    results.push({ campaign_id: campaignId, result_type: "item", dimension_code: info.dimension_code, segment_key: itemId, segment_type: "global", avg_score: r2(mean(scores)), std_score: r2(std(scores)), favorability_pct: r1(fav(scores)), response_count: scores.length, respondent_count: rc, metadata: { item_text: itemTextMap.get(itemId), dimension_name: info.dimension_name } });
  }

  // Engagement profiles
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
  results.push({ campaign_id: campaignId, result_type: "engagement", dimension_code: null, segment_key: "global", segment_type: "global", avg_score: r2(mean(engScores)), std_score: r2(std(engScores)), favorability_pct: r1(fav(engScores.map(Math.round))), response_count: total, respondent_count: total, metadata: { profiles: { ambassadors: { count: profiles.ambassadors, pct: r1((profiles.ambassadors / total) * 100) }, committed: { count: profiles.committed, pct: r1((profiles.committed / total) * 100) }, neutral: { count: profiles.neutral, pct: r1((profiles.neutral / total) * 100) }, disengaged: { count: profiles.disengaged, pct: r1((profiles.disengaged / total) * 100) } } } });

  // eNPS
  const { data: enpsData } = await supabase.from("respondents").select("enps_score").eq("campaign_id", campaignId).in("id", [...validIds]).not("enps_score", "is", null);
  if (enpsData?.length) {
    const enpsArr = enpsData.map((r) => r.enps_score!);
    const prom = enpsArr.filter((s) => s >= 9).length;
    const det = enpsArr.filter((s) => s <= 6).length;
    const t = enpsArr.length;
    results.push({ campaign_id: campaignId, result_type: "enps", dimension_code: null, segment_key: "global", segment_type: "global", avg_score: Math.round(((prom - det) / t) * 100), std_score: 0, favorability_pct: r1((prom / t) * 100), response_count: t, respondent_count: t, metadata: { promoters: { count: prom, pct: r1((prom / t) * 100) }, passives: { count: t - prom - det, pct: r1(((t - prom - det) / t) * 100) }, detractors: { count: det, pct: r1((det / t) * 100) } } });
  }

  // Ficha técnica
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = campaign.organizations as any;
  const N = org?.employee_count ?? 0;
  const n = validIds.size;
  const rr = N > 0 ? r2((n / N) * 100) : 0;
  const me = n > 0 && N > 1 ? r2(1.96 * Math.sqrt(0.25 / n) * Math.sqrt((N - n) / (N - 1)) * 100) : 0;
  await supabase.from("campaigns").update({ population_n: N, sample_n: n, response_rate: rr, margin_of_error: me }).eq("id", campaignId);

  // Insert results
  await supabase.from("campaign_results").delete().eq("campaign_id", campaignId);
  for (let i = 0; i < results.length; i += 50) {
    const { error } = await supabase.from("campaign_results").insert(results.slice(i, i + 50));
    if (error) { console.error("Insert error:", error); process.exit(1); }
  }

  console.log(`Inserted ${results.length} results. Done.`);
}

main().catch(console.error);

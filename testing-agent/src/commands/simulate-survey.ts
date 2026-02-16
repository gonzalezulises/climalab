import ora from "ora";
import chalk from "chalk";
import crypto from "crypto";
import { getSupabase } from "../lib/supabase.js";
import { generateEmployees } from "../data/generate-employees.js";
import { generateResponses, generateENPS, type ItemInfo } from "../data/generate-responses.js";
import { generateOpenResponses } from "../data/generate-open-responses.js";
import { CLIMATE_PRESETS } from "../data/constants.js";

export interface SimulateSurveyResult {
  totalRespondents: number;
  expectedDisqualified: number;
  openResponseCount: number;
}

export async function simulateSurveyCommand(opts: {
  campaignId: string;
  respondents: number;
  climate: string;
  failRate: number;
  departments: { name: string; headcount: number }[];
}): Promise<SimulateSurveyResult> {
  const supabase = getSupabase();
  const spinner = ora("Simulating survey responses...").start();

  const preset = CLIMATE_PRESETS[opts.climate];
  if (!preset) throw new Error(`Unknown climate preset: ${opts.climate}`);

  // Fetch campaign to get instrument IDs
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("instrument_id, module_instrument_ids")
    .eq("id", opts.campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  // Fetch all items for the instruments
  const allInstrumentIds = [campaign.instrument_id, ...(campaign.module_instrument_ids ?? [])];
  const { data: dimensions } = await supabase
    .from("dimensions")
    .select("code, items(id, text, is_reverse, is_attention_check)")
    .in("instrument_id", allInstrumentIds)
    .order("sort_order");

  if (!dimensions) throw new Error("No dimensions found");

  // Build item list
  const items: ItemInfo[] = [];
  for (const dim of dimensions) {
    for (const item of dim.items as any[]) {
      let expectedScore: number | undefined;
      if (item.is_attention_check) {
        const text = (item.text as string).toLowerCase();
        if (text.includes("de acuerdo") && !text.includes("en desacuerdo")) {
          expectedScore = 4;
        } else if (text.includes("en desacuerdo")) {
          expectedScore = 2;
        }
      }
      items.push({
        id: item.id,
        dimension_code: dim.code,
        is_reverse: item.is_reverse,
        is_attention_check: item.is_attention_check,
        expected_score: expectedScore,
      });
    }
  }

  // Generate employees
  const employees = generateEmployees(opts.respondents, opts.departments);

  // Determine who fails attention checks
  const failSet = new Set<number>();
  for (let i = 0; i < opts.respondents; i++) {
    if (Math.random() < opts.failRate) failSet.add(i);
  }

  spinner.text = `Creating ${opts.respondents} respondents + participants...`;

  let openResponseCount = 0;
  const now = new Date().toISOString();

  // Insert respondents + participants + responses in batches
  for (let batchStart = 0; batchStart < employees.length; batchStart += 25) {
    const batchEnd = Math.min(batchStart + 25, employees.length);
    const batchEmployees = employees.slice(batchStart, batchEnd);

    // Prepare respondent rows
    const respondentRows = batchEmployees.map((emp) => {
      return {
        campaign_id: opts.campaignId,
        token: crypto.randomUUID().slice(0, 16),
        department: emp.department,
        tenure: emp.tenure,
        gender: emp.gender,
        status: "completed" as const,
        started_at: now,
        completed_at: now,
        enps_score: generateENPS(),
      };
    });

    const { data: insertedRespondents, error: rError } = await supabase
      .from("respondents")
      .insert(respondentRows)
      .select("id");

    if (rError || !insertedRespondents) {
      throw new Error(`Insert respondents error: ${rError?.message}`);
    }

    // Insert participants (PII table)
    const participantRows = batchEmployees.map((emp, idx) => ({
      campaign_id: opts.campaignId,
      respondent_id: insertedRespondents[idx].id,
      name: emp.name,
      email: emp.email,
    }));

    await supabase.from("participants").insert(participantRows);

    // Generate and insert responses for each respondent
    for (let j = 0; j < insertedRespondents.length; j++) {
      const i = batchStart + j;
      const respondentId = insertedRespondents[j].id;
      const shouldFail = failSet.has(i);

      const responses = generateResponses(items, preset, { shouldFailAttention: shouldFail });

      // Insert responses in sub-batches
      const responseRows = responses.map((r) => ({
        respondent_id: respondentId,
        item_id: r.item_id,
        score: r.score,
        answered_at: now,
      }));

      for (let k = 0; k < responseRows.length; k += 100) {
        const { error: respError } = await supabase
          .from("responses")
          .insert(responseRows.slice(k, k + 100));
        if (respError) throw new Error(`Insert responses error: ${respError.message}`);
      }

      // Open responses (15-25% of respondents)
      if (Math.random() < 0.2 && !shouldFail) {
        const count = Math.floor(Math.random() * 3) + 1;
        const openResps = generateOpenResponses(count);
        const openRows = openResps.map((o) => ({
          respondent_id: respondentId,
          question_type: o.question_type,
          text: o.text,
        }));
        await supabase.from("open_responses").insert(openRows);
        openResponseCount += count;
      }
    }

    spinner.text = `Inserted ${Math.min(batchEnd, employees.length)}/${employees.length} respondents...`;
  }

  spinner.succeed(
    `Simulated ${chalk.bold(opts.respondents)} respondents\n` +
      `  Climate: ${opts.climate}, Expected failures: ~${failSet.size}\n` +
      `  Open responses: ${openResponseCount}`
  );

  return {
    totalRespondents: opts.respondents,
    expectedDisqualified: failSet.size,
    openResponseCount,
  };
}

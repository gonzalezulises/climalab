import chalk from "chalk";
import { randomUUID } from "node:crypto";
import { createOrgCommand } from "./create-org.js";
import { createCampaignCommand } from "./create-campaign.js";
import { cleanupCommand } from "./cleanup.js";
import { getSupabase } from "../lib/supabase.js";
import { getConfig } from "../lib/config.js";

type Assertion = {
  name: string;
  passed: boolean;
  details?: string;
};

type ItemRow = {
  id: string;
  text: string;
  is_attention_check: boolean;
};

function pushAssertion(assertions: Assertion[], name: string, passed: boolean, details?: string) {
  assertions.push({ name, passed, details });
  if (!passed) {
    throw new Error(details ?? name);
  }
}

function buildExpectedScore(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("de acuerdo") && !normalized.includes("en desacuerdo")) {
    return 4;
  }
  if (normalized.includes("en desacuerdo")) {
    return 2;
  }
  return 4;
}

function buildFullSurveyPayload(items: ItemRow[]) {
  return items.map((item) => ({
    itemId: item.id,
    score: item.is_attention_check ? buildExpectedScore(item.text) : 4,
  }));
}

function parseJsonResponse(text: string) {
  return text ? JSON.parse(text) : {};
}

async function ensureAppAvailable(baseUrl: string) {
  const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  if (!response.ok && response.status !== 307 && response.status !== 308) {
    throw new Error(`App no disponible en ${baseUrl} (status ${response.status})`);
  }
}

export async function e2eOpsCommand(opts: { skipCleanup?: boolean } = {}) {
  const supabase = getSupabase();
  const { appBaseUrl, ingestApiSecret, cronSecret } = getConfig();
  const assertions: Assertion[] = [];
  let orgId: string | null = null;

  if (!ingestApiSecret) throw new Error("INGEST_API_SECRET no configurada");
  if (!cronSecret) throw new Error("CRON_SECRET no configurada");

  try {
    await ensureAppAvailable(appBaseUrl);
    assertions.push({ name: "app reachable", passed: true });

    const orgResult = await createOrgCommand({ employees: 20, departments: 2 });
    orgId = orgResult.orgId;
    const campaignResult = await createCampaignCommand({ orgId, modules: ["CAM"] });

    await supabase
      .from("campaigns")
      .update({
        status: "active",
        starts_at: new Date(Date.now() - 60_000).toISOString(),
        ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", campaignResult.campaignId);

    const { data: dimensions, error: dimensionsError } = await supabase
      .from("dimensions")
      .select("code, items(id, text, is_attention_check)")
      .in("instrument_id", [campaignResult.instrumentId, ...campaignResult.moduleIds]);

    if (dimensionsError || !dimensions) {
      throw new Error(dimensionsError?.message ?? "No se pudieron cargar dimensiones");
    }

    const items = dimensions.flatMap((dimension) => dimension.items as ItemRow[]);
    const fullResponses = buildFullSurveyPayload(items);
    const ingestEventId = `e2e-ops-${randomUUID()}`;

    const ingestResponse = await fetch(`${appBaseUrl}/api/ingest/direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ingestApiSecret,
      },
      body: JSON.stringify({
        externalEventId: ingestEventId,
        campaignId: campaignResult.campaignId,
        demographics: {
          department: "Ops",
          tenure: "1-3",
          gender: "F",
        },
        responses: fullResponses,
        enpsScore: 9,
      }),
    });
    const ingestBody = parseJsonResponse(await ingestResponse.text());
    pushAssertion(
      assertions,
      "direct ingest works for ops flow",
      ingestResponse.ok && ingestBody.ok === true,
      JSON.stringify(ingestBody)
    );

    await supabase
      .from("campaigns")
      .update({ status: "closed", ends_at: new Date().toISOString() })
      .eq("id", campaignResult.campaignId);

    const batchResponse = await fetch(`${appBaseUrl}/api/jobs/analyze-batch?source=manual`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });
    const batchBody = parseJsonResponse(await batchResponse.text());
    pushAssertion(
      assertions,
      "batch route completes for ops flow",
      batchResponse.ok && batchBody.ok === true,
      JSON.stringify(batchBody)
    );

    const { data: snapshots, error: snapshotsError } = await (supabase as any)
      .from("analysis_run_snapshots")
      .select("analysis_run_id, data")
      .eq("campaign_id", campaignResult.campaignId)
      .limit(1);
    if (snapshotsError) throw new Error(snapshotsError.message);
    pushAssertion(
      assertions,
      "analysis snapshots persisted",
      (snapshots ?? []).length > 0,
      JSON.stringify(snapshots)
    );

    const { data: semanticRows, error: semanticRowsError } = await supabase
      .from("campaign_results")
      .select("dimension_code, instrument_type")
      .eq("campaign_id", campaignResult.campaignId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global");
    if (semanticRowsError) throw new Error(semanticRowsError.message);
    pushAssertion(
      assertions,
      "module lineage present in serving results",
      (semanticRows ?? []).some(
        (row) => row.dimension_code === "CAM" && row.instrument_type === "module"
      ),
      JSON.stringify(semanticRows)
    );

    const { data: onaRuns, error: onaRunsError } = await (supabase as any)
      .from("campaign_ona_runs")
      .select("status, error_message")
      .eq("campaign_id", campaignResult.campaignId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (onaRunsError) throw new Error(onaRunsError.message);
    pushAssertion(
      assertions,
      "ona run status persisted",
      (onaRuns ?? []).length > 0,
      JSON.stringify(onaRuns)
    );

    const passed = assertions.filter((assertion) => assertion.passed).length;
    console.log(chalk.green(`\n${passed}/${assertions.length} ops checks passed`));
    for (const assertion of assertions) {
      const prefix = assertion.passed ? chalk.green("PASS") : chalk.red("FAIL");
      console.log(
        `${prefix} ${assertion.name}${assertion.details ? ` — ${assertion.details}` : ""}`
      );
    }
  } finally {
    if (orgId && !opts.skipCleanup) {
      await cleanupCommand({ orgId });
    }
  }
}

import chalk from "chalk";
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

const INGEST_CONTRACT_VERSION = "2026-03-29";

type ItemRow = {
  id: string;
  text: string;
  is_attention_check: boolean;
};

function buildExpectedScore(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("de acuerdo") && !normalized.includes("en desacuerdo")) {
    return "4";
  }
  if (normalized.includes("en desacuerdo")) {
    return "2";
  }
  return "4";
}

function pushAssertion(assertions: Assertion[], name: string, passed: boolean, details?: string) {
  assertions.push({ name, passed, details });
  if (!passed) {
    throw new Error(details ?? name);
  }
}

async function ensureAppAvailable(baseUrl: string) {
  const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  if (!response.ok && response.status !== 307 && response.status !== 308) {
    throw new Error(`App no disponible en ${baseUrl} (status ${response.status})`);
  }
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function e2eLineageCommand(opts: { skipCleanup?: boolean } = {}) {
  const supabase = getSupabase();
  const { appBaseUrl, ingestApiSecret, cronSecret } = getConfig();
  const assertions: Assertion[] = [];
  let orgId: string | null = null;

  if (!ingestApiSecret) {
    throw new Error("INGEST_API_SECRET no configurada para ejecutar E2E lineage");
  }

  if (!cronSecret) {
    throw new Error("CRON_SECRET no configurada para ejecutar E2E lineage");
  }

  try {
    await ensureAppAvailable(appBaseUrl);
    assertions.push({ name: "app reachable", passed: true });

    const orgResult = await createOrgCommand({ employees: 30, departments: 3 });
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
      throw new Error(dimensionsError?.message ?? "No se pudieron cargar dimensiones para E2E");
    }

    const items = dimensions.flatMap((dimension) => dimension.items as ItemRow[]);
    const headers = [
      "department",
      "tenure",
      "gender",
      "enps_score",
      "open:general",
      ...items.map((item) => `item:${item.id}`),
    ];
    const row = [
      "Operaciones",
      "1-3",
      "F",
      "9",
      '"Comentario, con coma y salto\nde línea"',
      ...items.map((item) =>
        item.is_attention_check
          ? buildExpectedScore(item.text)
          : item.id.includes("cam")
            ? "5"
            : "4"
      ),
    ];
    const csv = `${headers.join(",")}\n${row.join(",")}\n`;

    const formData = new FormData();
    formData.set("campaignId", campaignResult.campaignId);
    formData.set("file", new File([csv], "responses.csv", { type: "text/csv" }));

    const firstCsvResponse = await fetch(`${appBaseUrl}/api/ingest/csv`, {
      method: "POST",
      headers: {
        "x-api-key": ingestApiSecret,
        "x-climalab-contract-version": INGEST_CONTRACT_VERSION,
      },
      body: formData,
    });
    const firstCsvBody = await parseJsonResponse(firstCsvResponse);
    pushAssertion(
      assertions,
      "csv import first delivery",
      firstCsvResponse.ok && firstCsvBody.ok === true && firstCsvBody.imported === 1,
      JSON.stringify(firstCsvBody)
    );

    const secondFormData = new FormData();
    secondFormData.set("campaignId", campaignResult.campaignId);
    secondFormData.set("file", new File([csv], "responses.csv", { type: "text/csv" }));

    const secondCsvResponse = await fetch(`${appBaseUrl}/api/ingest/csv`, {
      method: "POST",
      headers: {
        "x-api-key": ingestApiSecret,
        "x-climalab-contract-version": INGEST_CONTRACT_VERSION,
      },
      body: secondFormData,
    });
    const secondCsvBody = await parseJsonResponse(secondCsvResponse);
    pushAssertion(
      assertions,
      "csv import deduplicates deterministic payload",
      secondCsvResponse.ok && secondCsvBody.duplicates === 1,
      JSON.stringify(secondCsvBody)
    );

    const { data: ingestEvents, error: ingestEventsError } = await supabase
      .from("ingest_events")
      .select("status, respondent_id, contract_version")
      .eq("campaign_id", campaignResult.campaignId)
      .eq("source", "csv");

    if (ingestEventsError) {
      throw new Error(ingestEventsError.message);
    }

    pushAssertion(
      assertions,
      "csv ingest event completed once",
      (ingestEvents ?? []).length === 1 && ingestEvents?.[0]?.status === "completed",
      JSON.stringify(ingestEvents)
    );

    pushAssertion(
      assertions,
      "csv lineage persists ingest contract version",
      (ingestEvents ?? []).every((event) => event.contract_version === INGEST_CONTRACT_VERSION),
      JSON.stringify(ingestEvents)
    );

    await supabase
      .from("campaigns")
      .update({
        status: "closed",
        ends_at: new Date().toISOString(),
      })
      .eq("id", campaignResult.campaignId);

    const batchResponse = await fetch(`${appBaseUrl}/api/jobs/analyze-batch?source=manual`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const batchBody = await parseJsonResponse(batchResponse);
    pushAssertion(
      assertions,
      "batch analysis runs after csv ingest",
      batchResponse.ok && batchBody.processed >= 1,
      JSON.stringify(batchBody)
    );

    const { data: analysisRuns, error: analysisRunsError } = await supabase
      .from("analysis_runs")
      .select("id, status, trigger_source")
      .eq("campaign_id", campaignResult.campaignId)
      .order("started_at", { ascending: false });

    if (analysisRunsError) {
      throw new Error(analysisRunsError.message);
    }

    pushAssertion(
      assertions,
      "analysis runs created",
      (analysisRuns ?? []).some((run) => run.status === "completed"),
      JSON.stringify(analysisRuns)
    );

    const { data: results, error: resultsError } = await supabase
      .from("campaign_results")
      .select(
        "analysis_run_id, instrument_id, instrument_type, dimension_id, dimension_code, result_type"
      )
      .eq("campaign_id", campaignResult.campaignId)
      .eq("result_type", "dimension");

    if (resultsError) {
      throw new Error(resultsError.message);
    }

    pushAssertion(
      assertions,
      "dimension results keep explicit lineage",
      (results ?? []).every(
        (row) =>
          Boolean(row.analysis_run_id) &&
          Boolean(row.instrument_id) &&
          Boolean(row.dimension_id) &&
          Boolean(row.instrument_type)
      ),
      JSON.stringify(results)
    );

    pushAssertion(
      assertions,
      "module dimensions are tagged as module lineage",
      (results ?? []).some(
        (row) => row.dimension_code === "CAM" && row.instrument_type === "module"
      ),
      JSON.stringify(results)
    );

    const { data: snapshots, error: snapshotsError } = await (supabase as any)
      .from("analysis_run_snapshots")
      .select("analysis_run_id, data")
      .eq("campaign_id", campaignResult.campaignId)
      .limit(1);

    if (snapshotsError) {
      throw new Error(snapshotsError.message);
    }

    pushAssertion(
      assertions,
      "analysis snapshots persisted for lineage flow",
      (snapshots ?? []).length > 0,
      JSON.stringify(snapshots)
    );

    const passed = assertions.filter((assertion) => assertion.passed).length;
    console.log(chalk.green(`\n${passed}/${assertions.length} lineage checks passed`));
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

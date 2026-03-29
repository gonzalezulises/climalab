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
  is_reverse: boolean;
};

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

async function ensureAppAvailable(baseUrl: string) {
  const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  if (!response.ok && response.status !== 307 && response.status !== 308) {
    throw new Error(`App no disponible en ${baseUrl} (status ${response.status})`);
  }
}

async function assertJsonOk(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  name: string,
  assertions: Assertion[]
) {
  const response = await fetch(input, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  const passed = response.ok && body.ok !== false && !body.error;
  assertions.push({
    name,
    passed,
    details: passed ? undefined : `${response.status} ${JSON.stringify(body)}`,
  });
  if (!passed) {
    throw new Error(`${name}: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

function pushAssertion(assertions: Assertion[], name: string, passed: boolean, details?: string) {
  assertions.push({ name, passed, details });
  if (!passed) {
    throw new Error(details ?? name);
  }
}

export async function e2eHttpCommand(opts: { skipCleanup?: boolean } = {}) {
  const supabase = getSupabase();
  const { appBaseUrl, ingestApiSecret, cronSecret } = getConfig();
  const assertions: Assertion[] = [];
  let orgId: string | null = null;

  if (!ingestApiSecret) {
    throw new Error("INGEST_API_SECRET no configurada para ejecutar E2E HTTP");
  }

  if (!cronSecret) {
    throw new Error("CRON_SECRET no configurada para ejecutar E2E HTTP");
  }

  try {
    await ensureAppAvailable(appBaseUrl);
    assertions.push({ name: "app reachable", passed: true });

    const orgResult = await createOrgCommand({ employees: 25, departments: 4 });
    orgId = orgResult.orgId;
    const campaignResult = await createCampaignCommand({ orgId });

    const startsAt = new Date(Date.now() - 60_000).toISOString();
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: activateError } = await supabase
      .from("campaigns")
      .update({ status: "active", starts_at: startsAt, ends_at: endsAt })
      .eq("id", campaignResult.campaignId);
    if (activateError) {
      throw new Error(`No se pudo activar campaña: ${activateError.message}`);
    }

    const { data: dimensions, error: dimensionsError } = await supabase
      .from("dimensions")
      .select("code, items(id, text, is_attention_check, is_reverse)")
      .in("instrument_id", [campaignResult.instrumentId, ...campaignResult.moduleIds]);

    if (dimensionsError || !dimensions) {
      throw new Error(dimensionsError?.message ?? "No se pudieron cargar ítems de campaña");
    }

    const items = dimensions.flatMap((dimension) => dimension.items as ItemRow[]);
    const fullResponses = buildFullSurveyPayload(items);
    const ingestEventId = `e2e-http-${randomUUID()}`;

    const joinResponse = await fetch(
      `${appBaseUrl}/survey/campaign/${campaignResult.campaignId}/join`,
      {
        redirect: "manual",
      }
    );

    const location = joinResponse.headers.get("location") ?? "";
    const tokenMatch = location.match(/\/survey\/([^/?#]+)/);
    pushAssertion(
      assertions,
      "survey join redirects to token",
      Boolean((joinResponse.status === 307 || joinResponse.status === 302) && tokenMatch),
      `status=${joinResponse.status} location=${location}`
    );

    const token = tokenMatch?.[1];
    if (!token) {
      throw new Error("No se pudo extraer token de encuesta");
    }

    await assertJsonOk(
      `${appBaseUrl}/api/survey/${token}/start`,
      { method: "POST" },
      "survey start",
      assertions
    );
    await assertJsonOk(
      `${appBaseUrl}/api/survey/${token}/demographics`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: "Producto",
          tenure: "1-3",
          gender: "Prefiero no decir",
        }),
      },
      "survey demographics",
      assertions
    );
    await assertJsonOk(
      `${appBaseUrl}/api/survey/${token}/responses`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: fullResponses }),
      },
      "survey responses",
      assertions
    );
    await assertJsonOk(
      `${appBaseUrl}/api/survey/${token}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enpsScore: 9,
          openResponses: [
            {
              questionType: "general",
              text: "Prueba E2E del survey público por HTTP.",
            },
          ],
        }),
      },
      "survey complete",
      assertions
    );

    const { data: surveyRespondent, error: surveyRespondentError } = await supabase
      .from("respondents")
      .select("id, status, completed_at")
      .eq("token", token)
      .single();
    if (surveyRespondentError || !surveyRespondent) {
      throw new Error(surveyRespondentError?.message ?? "No se encontró respondente de survey");
    }
    pushAssertion(
      assertions,
      "survey respondent completed",
      surveyRespondent.status === "completed" && Boolean(surveyRespondent.completed_at),
      JSON.stringify(surveyRespondent)
    );

    const { count: surveyResponseCount, error: surveyResponseCountError } = await supabase
      .from("responses")
      .select("*", { count: "exact", head: true })
      .eq("respondent_id", surveyRespondent.id)
      .eq("source", "web");
    if (surveyResponseCountError) {
      throw new Error(surveyResponseCountError.message);
    }
    pushAssertion(
      assertions,
      "survey responses stored as web source",
      (surveyResponseCount ?? 0) === fullResponses.length,
      `stored=${surveyResponseCount} expected=${fullResponses.length}`
    );

    const ingestBody = {
      externalEventId: ingestEventId,
      campaignId: campaignResult.campaignId,
      demographics: {
        department: "Integraciones",
        tenure: "3-5",
        gender: "No binario",
      },
      responses: fullResponses,
      openResponses: [
        {
          questionType: "general",
          text: "Prueba E2E de ingesta directa con deduplicación.",
        },
      ],
      enpsScore: 8,
    };

    const ingestResult = await assertJsonOk(
      `${appBaseUrl}/api/ingest/direct`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ingestApiSecret,
        },
        body: JSON.stringify(ingestBody),
      },
      "direct ingest first delivery",
      assertions
    );
    pushAssertion(
      assertions,
      "direct ingest creates respondent",
      ingestResult.duplicate === false && Boolean(ingestResult.respondentId),
      JSON.stringify(ingestResult)
    );

    const ingestDuplicate = await assertJsonOk(
      `${appBaseUrl}/api/ingest/direct`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ingestApiSecret,
        },
        body: JSON.stringify(ingestBody),
      },
      "direct ingest duplicate delivery",
      assertions
    );
    pushAssertion(
      assertions,
      "direct ingest deduplicates repeated event",
      ingestDuplicate.duplicate === true,
      JSON.stringify(ingestDuplicate)
    );

    const { data: ingestEvent, error: ingestEventError } = await supabase
      .from("ingest_events")
      .select("status, respondent_id")
      .eq("source", "api")
      .eq("external_event_id", ingestEventId)
      .single();
    if (ingestEventError || !ingestEvent) {
      throw new Error(ingestEventError?.message ?? "No se encontró ingest_event");
    }
    pushAssertion(
      assertions,
      "ingest event completed",
      ingestEvent.status === "completed" && Boolean(ingestEvent.respondent_id),
      JSON.stringify(ingestEvent)
    );

    const { count: campaignStatsCount, error: campaignStatsError } = await supabase
      .from("campaign_stats")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignResult.campaignId);
    if (campaignStatsError) {
      throw new Error(campaignStatsError.message);
    }
    pushAssertion(
      assertions,
      "campaign stats refreshed after survey and ingest",
      (campaignStatsCount ?? 0) > 0,
      `campaign_stats=${campaignStatsCount}`
    );

    const { error: closeError } = await supabase
      .from("campaigns")
      .update({ status: "closed", ends_at: new Date().toISOString() })
      .eq("id", campaignResult.campaignId);
    if (closeError) {
      throw new Error(closeError.message);
    }

    const batchResult = await assertJsonOk(
      `${appBaseUrl}/api/jobs/analyze-batch?source=manual`,
      {
        method: "GET",
        headers: {
          "x-cron-secret": cronSecret,
        },
      },
      "batch analysis route",
      assertions
    );
    pushAssertion(
      assertions,
      "batch processed target campaign",
      Array.isArray(batchResult.results) &&
        batchResult.results.some(
          (result: { campaignId?: string; success?: boolean }) =>
            result.campaignId === campaignResult.campaignId && result.success === true
        ),
      JSON.stringify(batchResult)
    );

    const { data: batchRun, error: batchRunError } = await supabase
      .from("batch_job_runs")
      .select("id, trigger_source, status, processed")
      .eq("id", batchResult.runId)
      .single();
    if (batchRunError || !batchRun) {
      throw new Error(batchRunError?.message ?? "No se encontró batch_job_run");
    }
    pushAssertion(
      assertions,
      "batch run persisted",
      batchRun.trigger_source === "manual" &&
        batchRun.status === "completed" &&
        typeof batchRun.processed === "number",
      JSON.stringify(batchRun)
    );

    const { count: campaignResultsCount, error: campaignResultsError } = await supabase
      .from("campaign_results")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignResult.campaignId);
    if (campaignResultsError) {
      throw new Error(campaignResultsError.message);
    }
    pushAssertion(
      assertions,
      "batch generated campaign_results",
      (campaignResultsCount ?? 0) > 0,
      `campaign_results=${campaignResultsCount}`
    );

    const { count: campaignAnalyticsCount, error: campaignAnalyticsError } = await supabase
      .from("campaign_analytics")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignResult.campaignId);
    if (campaignAnalyticsError) {
      throw new Error(campaignAnalyticsError.message);
    }
    pushAssertion(
      assertions,
      "batch generated campaign_analytics",
      (campaignAnalyticsCount ?? 0) > 0,
      `campaign_analytics=${campaignAnalyticsCount}`
    );

    console.log(chalk.bold.blue("\n  HTTP E2E Verification\n"));
    for (const assertion of assertions) {
      const status = assertion.passed ? chalk.green("✓ PASS") : chalk.red("✗ FAIL");
      console.log(`  ${status} ${assertion.name}`);
      if (assertion.details) {
        console.log(chalk.dim(`    ${assertion.details}`));
      }
    }
    console.log(chalk.green.bold(`\n  ${assertions.length} HTTP E2E checks passed\n`));
  } finally {
    if (orgId && !opts.skipCleanup) {
      await cleanupCommand({ orgId });
    }
  }
}

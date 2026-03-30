import chalk from "chalk";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { getConfig, loadEnvFile } from "../lib/config.js";
import { getSupabase, resetClient } from "../lib/supabase.js";

type Assertion = {
  name: string;
  passed: boolean;
  details?: string;
};

function pushAssertion(assertions: Assertion[], name: string, passed: boolean, details?: string) {
  assertions.push({ name, passed, details });
}

function isInvalidApiKeyResponse(text: string) {
  return text.toLowerCase().includes("invalid api key");
}

export async function e2eProdSmokeCommand(opts: { envFile?: string } = {}) {
  const envFile = opts.envFile
    ? resolve(process.cwd(), opts.envFile)
    : resolve(process.cwd(), ".env.production.local");

  if (existsSync(envFile)) {
    loadEnvFile(envFile, true);
    resetClient();
  }

  const { appBaseUrl, cronSecret, ingestApiSecret, supabaseServiceKey } = getConfig({
    allowFallbackKey: false,
  });

  const assertions: Assertion[] = [];

  if (!cronSecret) throw new Error("CRON_SECRET no configurada");
  if (!ingestApiSecret) throw new Error("INGEST_API_SECRET no configurada");

  const siteResponse = await fetch(appBaseUrl, { redirect: "manual" });
  pushAssertion(
    assertions,
    "production site reachable",
    siteResponse.ok || siteResponse.status === 307 || siteResponse.status === 308,
    `status ${siteResponse.status}`
  );

  const batchResponse = await fetch(`${appBaseUrl}/api/jobs/analyze-batch?source=manual&hours=24`, {
    headers: {
      "x-cron-secret": cronSecret,
    },
  });
  const batchText = await batchResponse.text();
  pushAssertion(
    assertions,
    "batch route does not reject admin key",
    batchResponse.ok || !isInvalidApiKeyResponse(batchText),
    batchText
  );

  const ingestResponse = await fetch(`${appBaseUrl}/api/ingest/direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ingestApiSecret,
    },
    body: JSON.stringify({
      externalEventId: "prod-smoke-invalid-payload",
      campaignId: "00000000-0000-0000-0000-000000000000",
      demographics: {
        department: "Ops",
        tenure: "1-3",
        gender: "Prefiero no decir",
      },
      responses: [],
    }),
  });
  const ingestText = await ingestResponse.text();
  pushAssertion(
    assertions,
    "direct ingest auth reaches validation layer",
    ingestResponse.status === 400 && !isInvalidApiKeyResponse(ingestText),
    ingestText
  );

  if (supabaseServiceKey) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("pipeline_dispatch_events")
      .select("status, response_status, reason")
      .order("created_at", { ascending: false })
      .limit(1);

    pushAssertion(
      assertions,
      "pipeline dispatch can be queried with explicit service key",
      !error && Array.isArray(data),
      error?.message ?? JSON.stringify(data)
    );
  } else {
    assertions.push({
      name: "pipeline dispatch DB check skipped",
      passed: true,
      details: "No explicit SUPABASE_SERVICE_ROLE_KEY available in env file",
    });
  }

  const passed = assertions.filter((assertion) => assertion.passed).length;
  console.log(chalk.green(`\n${passed}/${assertions.length} production smoke checks passed`));
  for (const assertion of assertions) {
    const prefix = assertion.passed ? chalk.green("PASS") : chalk.red("FAIL");
    console.log(`${prefix} ${assertion.name}${assertion.details ? ` — ${assertion.details}` : ""}`);
  }

  const failures = assertions.filter((assertion) => !assertion.passed);
  if (failures.length > 0) {
    throw new Error(failures.map((failure) => failure.details ?? failure.name).join("\n"));
  }

  return assertions;
}

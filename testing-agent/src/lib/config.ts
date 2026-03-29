import { config } from "dotenv";
import { execSync } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

// Load env with fallback/override order:
// 1. repo .env.local
// 2. testing-agent/.env
// 3. process environment
const agentEnv = resolve(import.meta.dirname, "../../.env");
const rootEnv = resolve(import.meta.dirname, "../../../.env.local");

if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}
if (existsSync(agentEnv)) {
  config({ path: agentEnv, override: false });
}

const DEFAULT_URL = "http://127.0.0.1:54321";

/**
 * Tries to get the service_role key from `supabase status --output json`.
 */
function getServiceKeyFromCLI(): string | null {
  try {
    const projectDir = resolve(import.meta.dirname, "../../..");
    const output = execSync("supabase status --output json", {
      cwd: projectDir,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const data = JSON.parse(output);
    return data.SERVICE_ROLE_KEY ?? null;
  } catch {
    return null;
  }
}

// CLI overrides (set before getConfig is called)
let cliOverrides: { url?: string; key?: string } = {};

export function setCliOverrides(overrides: { url?: string; key?: string }) {
  cliOverrides = overrides;
  cachedConfig = null; // Reset cache
}

export function loadEnvFile(path: string, override = true) {
  if (existsSync(path)) {
    config({ path, override });
    cachedConfig = null;
  }
}

let cachedConfig: {
  supabaseUrl: string;
  supabaseServiceKey: string;
  appBaseUrl: string;
  ingestApiSecret: string;
  cronSecret: string;
} | null = null;

export function getConfig(options: { allowFallbackKey?: boolean } = {}) {
  if (cachedConfig) return cachedConfig;

  const allowFallbackKey = options.allowFallbackKey ?? true;
  const supabaseUrl = cliOverrides.url || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  let supabaseServiceKey = cliOverrides.key || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const appBaseUrl =
    process.env.CLIMALAB_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const ingestApiSecret = process.env.INGEST_API_SECRET || "";
  const cronSecret = process.env.CRON_SECRET || "";

  if (!supabaseServiceKey && allowFallbackKey) {
    const cliKey = getServiceKeyFromCLI();
    if (cliKey) {
      supabaseServiceKey = cliKey;
    } else {
      // Legacy HS256 fallback for older Supabase installations
      supabaseServiceKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
    }
  }

  cachedConfig = { supabaseUrl, supabaseServiceKey, appBaseUrl, ingestApiSecret, cronSecret };
  return cachedConfig;
}

import { config } from "dotenv";
import { execSync } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

// Load env: testing-agent/.env > ../../.env.local > environment
const agentEnv = resolve(import.meta.dirname, "../../.env");
const rootEnv = resolve(import.meta.dirname, "../../../.env.local");

if (existsSync(agentEnv)) {
  config({ path: agentEnv });
} else if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

const DEFAULT_URL = "http://127.0.0.1:54321";

/**
 * Tries to get the service_role key from `supabase status --output json`.
 * Falls back to legacy HS256 demo key if unavailable.
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

let cachedConfig: { supabaseUrl: string; supabaseServiceKey: string } | null = null;

export function getConfig() {
  if (cachedConfig) return cachedConfig;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseServiceKey) {
    const cliKey = getServiceKeyFromCLI();
    if (cliKey) {
      supabaseServiceKey = cliKey;
    } else {
      // Legacy HS256 fallback for older Supabase installations
      supabaseServiceKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
    }
  }

  cachedConfig = { supabaseUrl, supabaseServiceKey };
  return cachedConfig;
}

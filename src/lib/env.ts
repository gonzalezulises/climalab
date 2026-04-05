import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalString,
  OLLAMA_BASE_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url().optional()
  ),
  OLLAMA_MODEL: z.string().default("qwen2.5:72b"),
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().default("claude-haiku-4-5-20251001"),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default("gpt-4o"),
  TALLY_API_KEY: optionalString,
  TALLY_WEBHOOK_SECRET: optionalString,
  INGEST_API_SECRET: optionalString,
  CRON_SECRET: optionalString,
  AI_INSIGHT_HOOK_SECRET: optionalString,
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_ALERT_CHAT_ID: optionalString,
  PIPELINE_ALERT_WEBHOOK_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url().optional()
  ),
  PIPELINE_ALERT_EMAIL_TO: optionalString,
  STATISTICAL_ENGINE_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url().optional()
  ),
  STATISTICAL_API_SECRET: optionalString,
});

export const env = envSchema.parse(process.env);

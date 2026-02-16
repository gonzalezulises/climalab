import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().default("qwen2.5:72b"),
  AI_LOCAL_ENDPOINT: z.string().url().optional(),
  AI_LOCAL_MODEL: z.string().default("qwen2.5:72b"),
  AI_LOCAL_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);

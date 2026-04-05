import { z } from "zod";

// ---------------------------------------------------------------------------
// campaign_analytics.data shapes por analysis_type
// ---------------------------------------------------------------------------

export const analyticsAlertSchema = z.object({
  severity: z.string(),
  message: z.string(),
  type: z.string().optional(),
  value: z.number().optional(),
  threshold: z.number().optional(),
});
export type AnalyticsAlert = z.infer<typeof analyticsAlertSchema>;

export const analyticsCategorySchema = z.object({
  category: z.string(),
  avg_score: z.number(),
  favorability_pct: z.number(),
});
export type AnalyticsCategory = z.infer<typeof analyticsCategorySchema>;

export const analyticsDriverSchema = z.object({
  code: z.string(),
  name: z.string(),
  r: z.number(),
});
export type AnalyticsDriver = z.infer<typeof analyticsDriverSchema>;

export const analyticsHlmDimensionSchema = z.object({
  code: z.string(),
  icc: z.number(),
  icc_label: z.string(),
});

export const analyticsHlmSchema = z.object({
  dimensions: z.array(analyticsHlmDimensionSchema).optional(),
});
export type AnalyticsHlm = z.infer<typeof analyticsHlmSchema>;

export const analyticsInvarianceLevelSchema = z.object({
  level: z.string(),
  passed: z.boolean(),
});

export const analyticsInvarianceGroupSchema = z.object({
  grouping_variable: z.string().optional(),
  levels: z.array(analyticsInvarianceLevelSchema).optional(),
});
export type AnalyticsInvarianceGroup = z.infer<typeof analyticsInvarianceGroupSchema>;

// ---------------------------------------------------------------------------
// campaign_results.metadata shapes
// ---------------------------------------------------------------------------

export const resultMetadataSchema = z.object({
  dimension_name: z.string().optional(),
});
export type ResultMetadata = z.infer<typeof resultMetadataSchema>;

// ---------------------------------------------------------------------------
// Helpers — parse unknown JSONB safely, returning defaults on invalid data
// ---------------------------------------------------------------------------

export function parseAnalyticsArray<T>(schema: z.ZodType<T>, value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      console.warn(
        JSON.stringify({
          level: "warn",
          service: "analytics-parse",
          issue: parsed.error.issues[0]?.message ?? "invalid item",
          item: JSON.stringify(item).slice(0, 200),
        })
      );
      return [];
    }
    return [parsed.data];
  });
}

export function parseAnalyticsObject<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

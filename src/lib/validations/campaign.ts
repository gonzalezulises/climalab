import { z } from "zod";

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const zUuid = (msg?: string) => z.string().regex(uuidRegex, msg ?? "UUID inválido");

export const createCampaignSchema = z.object({
  organization_id: zUuid("ID de organización inválido"),
  instrument_id: zUuid("ID de instrumento inválido"),
  name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  anonymous: z.boolean().default(true),
  allow_comments: z.boolean().default(true),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  measurement_objective: z
    .enum([
      "initial_diagnosis",
      "periodic_followup",
      "post_intervention",
      "specific_assessment",
      "other",
    ])
    .optional(),
  objective_description: z.string().max(500).optional(),
  context_notes: z.string().max(2000).optional(),
  target_departments: z.array(z.string()).optional(),
  target_population: z.number().int().min(1).optional(),
});

export const updateCampaignStatusSchema = z.object({
  id: zUuid(),
  status: z.enum(["draft", "active", "closed", "archived"]),
});

export const generateLinksSchema = z.object({
  campaign_id: zUuid(),
  count: z.number().int().min(1, "Mínimo 1 enlace").max(1000, "Máximo 1000 enlaces"),
});

export type CreateCampaignInput = z.input<typeof createCampaignSchema>;
export type UpdateCampaignStatusInput = z.infer<typeof updateCampaignStatusSchema>;
export type GenerateLinksInput = z.infer<typeof generateLinksSchema>;

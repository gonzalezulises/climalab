import { z } from "zod";

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const zUuid = (msg?: string) => z.string().regex(uuidRegex, msg ?? "UUID inválido");

export const createBusinessIndicatorSchema = z.object({
  campaign_id: zUuid("ID de campaña inválido"),
  indicator_name: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  indicator_value: z.number({ error: "Valor requerido" }),
  indicator_unit: z.string().max(20, "Máximo 20 caracteres").nullish(),
  indicator_type: z
    .enum([
      "turnover_rate",
      "absenteeism_rate",
      "customer_nps",
      "customer_satisfaction",
      "productivity_index",
      "incident_count",
      "custom",
    ])
    .default("custom"),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  notes: z.string().max(500, "Máximo 500 caracteres").nullish(),
});

export type CreateBusinessIndicatorInput = z.input<typeof createBusinessIndicatorSchema>;

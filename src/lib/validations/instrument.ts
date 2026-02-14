import { z } from "zod";

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const createInstrumentSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  slug: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  description: z.string().max(500).optional(),
  mode: z.enum(["full", "pulse"]),
  target_size: z.enum(["all", "small", "medium"]),
  version: z.string().default("1.0"),
});

export const updateItemSchema = z.object({
  id: z.string().regex(uuidRegex, "UUID inválido"),
  text: z.string().min(5, "Mínimo 5 caracteres").max(500, "Máximo 500 caracteres"),
  is_reverse: z.boolean(),
  is_anchor: z.boolean(),
  is_attention_check: z.boolean(),
});

export type CreateInstrumentInput = z.infer<typeof createInstrumentSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

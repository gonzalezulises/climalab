import { z } from "zod";

export const surveyResponsesSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().uuid("itemId debe ser un UUID válido"),
        score: z.number().int().min(1).max(5),
      })
    )
    .min(1, "Se requiere al menos una respuesta"),
});

export const surveyDemographicsSchema = z.object({
  department: z.string().min(1).max(200),
  tenure: z.string().min(1).max(100),
  gender: z.string().max(100).nullable().optional(),
});

export const surveyCompleteSchema = z.object({
  enpsScore: z.number().int().min(0).max(10).nullable().optional(),
  openResponses: z
    .array(
      z.object({
        questionType: z.enum(["strength", "improvement", "general"]),
        text: z.string().min(1).max(5000),
      })
    )
    .optional(),
});

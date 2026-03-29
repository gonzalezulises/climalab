import { z } from "zod";
import { zUuid } from "@/lib/validations/uuid";

export const normalizedSubmissionSchema = z.object({
  source: z.enum(["webhook", "csv", "api"]),
  contractVersion: z.string().trim().min(1).optional(),
  externalEventId: z.string().trim().min(1),
  externalSubjectId: z.string().trim().min(1).optional().nullable(),
  campaignId: zUuid("ID de campaña inválido"),
  mappingVersion: z.string().trim().min(1).optional().nullable(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  demographics: z.object({
    department: z.string().trim().min(1).optional().nullable(),
    tenure: z.string().trim().min(1).optional().nullable(),
    gender: z.string().trim().min(1).optional().nullable(),
  }),
  responses: z
    .array(
      z.object({
        itemId: zUuid("ID de item inválido"),
        score: z.number().int().min(1).max(5),
      })
    )
    .min(1),
  openResponses: z
    .array(
      z.object({
        questionType: z.enum(["strength", "improvement", "general"]),
        text: z.string().trim().min(3).max(2000),
      })
    )
    .optional()
    .default([]),
  enpsScore: z.number().int().min(0).max(10).optional().nullable(),
});

export type NormalizedSubmissionInput = z.infer<typeof normalizedSubmissionSchema>;

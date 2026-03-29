import { describe, expect, it } from "vitest";
import { normalizedSubmissionSchema } from "@/lib/normalizeResponse.schema";

const validPayload = {
  source: "api" as const,
  externalEventId: "evt-123",
  campaignId: "a0000000-0000-0000-0000-000000000001",
  demographics: {
    department: "Ops",
    tenure: "1-3",
    gender: "F",
  },
  responses: [
    {
      itemId: "b0000000-0000-0000-0000-000000000001",
      score: 4,
    },
  ],
  openResponses: [
    {
      questionType: "general" as const,
      text: "Comentario suficientemente largo",
    },
  ],
  enpsScore: 9,
};

describe("normalizedSubmissionSchema", () => {
  it("accepts the canonical payload shape for alternative ingestion", () => {
    expect(normalizedSubmissionSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects scores outside the allowed likert range", () => {
    const result = normalizedSubmissionSchema.safeParse({
      ...validPayload,
      responses: [{ itemId: validPayload.responses[0].itemId, score: 7 }],
    });

    expect(result.success).toBe(false);
  });
});

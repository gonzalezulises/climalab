import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { INGEST_CONTRACT_VERSION } from "@/lib/ingest-contract";
import { normalizeResponse } from "@/lib/normalizeResponse";
import { rateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TallyField = {
  key: string;
  label: string;
  type: string;
  value: unknown;
  options?: Array<{ id: string; text: string }>;
};

type TallyWebhookPayload = {
  eventId: string;
  eventType: string;
  createdAt: string;
  data: {
    responseId: string;
    submissionId: string;
    respondentId: string;
    formId: string;
    formName: string;
    createdAt: string;
    fields: TallyField[];
  };
};

// Tenure label → DB value
const TENURE_MAP: Record<string, string> = {
  "menos de 1 año": "<1",
  "1-3 años": "1-3",
  "3-5 años": "3-5",
  "5-10 años": "5-10",
  "más de 10 años": "10+",
};

// Gender label → DB value
const GENDER_MAP: Record<string, string> = {
  femenino: "female",
  masculino: "male",
  otro: "other",
  "prefiero no decir": "prefer_not_to_say",
};

// ---------------------------------------------------------------------------
// Verify Tally signature
// ---------------------------------------------------------------------------
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("base64");
  return signature === expected;
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/tally
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await rateLimit(`webhook-tally:${ip}`, { limit: 100, windowMs: 60_000 });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const rawBody = await request.text();

  const webhookSecret = process.env.TALLY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "TALLY_WEBHOOK_SECRET no configurada" }, { status: 503 });
  }

  const signature = request.headers.get("tally-signature") ?? "";
  if (!verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: TallyWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.eventType !== "FORM_RESPONSE") {
    return NextResponse.json({ ok: true });
  }

  const { formId, fields } = payload.data;

  const supabase = createAdminClient();

  // Load mappings for this form
  const { data: mappings, error: mapError } = await supabase
    .from("tally_form_mappings")
    .select("tally_field_key, target_type, target_id, target_meta, campaign_id")
    .eq("tally_form_id", formId);

  if (mapError || !mappings || mappings.length === 0) {
    console.error("No mappings found for Tally form:", formId, mapError);
    return NextResponse.json({ error: "Form not recognized" }, { status: 404 });
  }

  const campaignId = (mappings[0] as Record<string, unknown>).campaign_id as string;

  // Build lookup: tally_field_key → mapping
  const mappingLookup = new Map<string, Record<string, unknown>>();
  for (const m of mappings as Record<string, unknown>[]) {
    mappingLookup.set(m.tally_field_key as string, m);
  }

  // Process fields
  const responses: Array<{ item_id: string; score: number }> = [];
  const openResponses: Array<{ question_type: string; text: string }> = [];
  let department: string | null = null;
  let tenure: string | null = null;
  let gender: string | null = null;
  let enpsScore: number | null = null;

  for (const field of fields) {
    const mapping = mappingLookup.get(field.key);
    if (!mapping) continue;

    const targetType = mapping.target_type as string;
    const targetMeta = mapping.target_meta as string | null;

    switch (targetType) {
      case "item": {
        const score = Number(field.value);
        if (score >= 1 && score <= 5 && mapping.target_id) {
          responses.push({ item_id: mapping.target_id as string, score });
        }
        break;
      }

      case "demographic": {
        const rawValue =
          typeof field.value === "string"
            ? field.value
            : Array.isArray(field.value) && field.value.length > 0
              ? String(field.value[0])
              : "";
        const normalizedValue = rawValue.toLowerCase().trim();

        if (targetMeta === "department") {
          department = rawValue.trim() || null;
        } else if (targetMeta === "tenure") {
          tenure = TENURE_MAP[normalizedValue] ?? (rawValue.trim() || null);
        } else if (targetMeta === "gender") {
          gender = GENDER_MAP[normalizedValue] ?? (rawValue.trim() || null);
        }
        break;
      }

      case "open_response": {
        const text = String(field.value ?? "").trim();
        if (text.length >= 3 && targetMeta) {
          openResponses.push({ question_type: targetMeta, text });
        }
        break;
      }

      case "enps": {
        const val = Number(field.value);
        if (val >= 0 && val <= 10) {
          enpsScore = val;
        }
        break;
      }
    }
  }

  try {
    const result = await normalizeResponse({
      source: "webhook",
      contractVersion: INGEST_CONTRACT_VERSION,
      externalEventId: payload.data.responseId || payload.eventId,
      externalSubjectId: payload.data.respondentId || payload.data.submissionId || undefined,
      campaignId,
      mappingVersion: "tally_form_mapping_v1",
      startedAt: payload.data.createdAt,
      completedAt: payload.data.createdAt,
      metadata: {
        provider: "tally",
        formId,
        submissionId: payload.data.submissionId,
      },
      demographics: {
        department,
        tenure,
        gender,
      },
      responses: responses.map((entry) => ({
        itemId: entry.item_id,
        score: entry.score,
      })),
      openResponses: openResponses.map((entry) => ({
        questionType: entry.question_type as "strength" | "improvement" | "general",
        text: entry.text,
      })),
      enpsScore,
    });

    if (result.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  } catch (error) {
    console.error("Failed to normalize Tally response:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to ingest Tally response" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

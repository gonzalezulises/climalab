import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import type { Database } from "@/types/database";

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
  const rawBody = await request.text();

  // Verify signature if secret is configured
  const webhookSecret = process.env.TALLY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("tally-signature") ?? "";
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
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

  // Use service role to bypass RLS
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  // Create respondent
  const { data: respondent, error: respError } = await supabase
    .from("respondents")
    .insert({
      campaign_id: campaignId,
      status: "completed",
      department,
      tenure,
      gender,
      enps_score: enpsScore,
      started_at: payload.data.createdAt,
      completed_at: payload.data.createdAt,
    })
    .select("id")
    .single();

  if (respError || !respondent) {
    console.error("Failed to create respondent:", respError);
    return NextResponse.json({ error: "Failed to create respondent" }, { status: 500 });
  }

  // Insert responses
  if (responses.length > 0) {
    const responseRows = responses.map((r) => ({
      respondent_id: respondent.id,
      item_id: r.item_id,
      score: r.score,
    }));

    const { error: insertError } = await supabase.from("responses").insert(responseRows);
    if (insertError) {
      console.error("Failed to insert responses:", insertError);
    }
  }

  // Insert open responses
  if (openResponses.length > 0) {
    const openRows = openResponses.map((r) => ({
      respondent_id: respondent.id,
      question_type: r.question_type,
      text: r.text,
    }));

    const { error: openError } = await supabase.from("open_responses").insert(openRows);
    if (openError) {
      console.error("Failed to insert open responses:", openError);
    }
  }

  return NextResponse.json({ ok: true, respondentId: respondent.id });
}

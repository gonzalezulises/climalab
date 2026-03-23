"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { ActionResult } from "@/types";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TallyBlock = {
  uuid: string;
  type: string;
  groupUuid: string;
  groupType: string;
  payload?: Record<string, unknown>;
};

type FieldMapping = {
  tally_field_key: string;
  target_type: "item" | "demographic" | "open_response" | "enps";
  target_id: string | null;
  target_meta: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TALLY_API = "https://api.tally.so";

const TENURE_OPTIONS = [
  { label: "Menos de 1 año", value: "<1" },
  { label: "1-3 años", value: "1-3" },
  { label: "3-5 años", value: "3-5" },
  { label: "5-10 años", value: "5-10" },
  { label: "Más de 10 años", value: "10+" },
];

const GENDER_OPTIONS = [
  { label: "Femenino", value: "female" },
  { label: "Masculino", value: "male" },
  { label: "Otro", value: "other" },
  { label: "Prefiero no decir", value: "prefer_not_to_say" },
];

const LIKERT_LABELS: Record<number, string> = {
  1: "Totalmente en desacuerdo",
  2: "En desacuerdo",
  3: "Ni acuerdo ni desacuerdo",
  4: "De acuerdo",
  5: "Totalmente de acuerdo",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uuid() {
  return randomUUID();
}

function makePageGroup() {
  return uuid();
}

function titleBlock(groupUuid: string, text: string): TallyBlock {
  return {
    uuid: uuid(),
    type: "TITLE",
    groupUuid,
    groupType: "TITLE",
    payload: { html: `<p>${text}</p>`, level: "DEFAULT" },
  };
}

function formTitleBlock(groupUuid: string, title: string, description?: string): TallyBlock {
  const payload: Record<string, unknown> = {
    html: `<p>${title}</p>`,
    level: "DEFAULT",
  };
  if (description) {
    payload.description = `<p>${description}</p>`;
  }
  return {
    uuid: uuid(),
    type: "FORM_TITLE",
    groupUuid,
    groupType: "FORM_TITLE",
    payload,
  };
}

function multipleChoiceBlock(
  groupUuid: string,
  label: string,
  options: { label: string; value: string }[]
): { block: TallyBlock; fieldKey: string } {
  const fieldKey = uuid();
  return {
    fieldKey,
    block: {
      uuid: fieldKey,
      type: "MULTIPLE_CHOICE",
      groupUuid,
      groupType: "QUESTION",
      payload: {
        label: `<p>${label}</p>`,
        isRequired: true,
        options: options.map((o) => ({
          id: uuid(),
          text: o.label,
        })),
      },
    },
  };
}

function linearScaleBlock(
  groupUuid: string,
  label: string,
  min: number,
  max: number,
  minLabel?: string,
  maxLabel?: string
): { block: TallyBlock; fieldKey: string } {
  const fieldKey = uuid();
  return {
    fieldKey,
    block: {
      uuid: fieldKey,
      type: "LINEAR_SCALE",
      groupUuid,
      groupType: "QUESTION",
      payload: {
        label: `<p>${label}</p>`,
        isRequired: true,
        min,
        max,
        minLabel: minLabel ?? undefined,
        maxLabel: maxLabel ?? undefined,
      },
    },
  };
}

function textareaBlock(
  groupUuid: string,
  label: string,
  required: boolean
): { block: TallyBlock; fieldKey: string } {
  const fieldKey = uuid();
  return {
    fieldKey,
    block: {
      uuid: fieldKey,
      type: "TEXTAREA",
      groupUuid,
      groupType: "TEXTAREA",
      payload: {
        label: `<p>${label}</p>`,
        isRequired: required,
      },
    },
  };
}

function hiddenFieldBlock(
  groupUuid: string,
  label: string
): { block: TallyBlock; fieldKey: string } {
  const fieldKey = uuid();
  return {
    fieldKey,
    block: {
      uuid: fieldKey,
      type: "HIDDEN_FIELDS",
      groupUuid,
      groupType: "HIDDEN_FIELDS",
      payload: { label },
    },
  };
}

function pageBreakBlock(groupUuid: string): TallyBlock {
  return {
    uuid: uuid(),
    type: "PAGE_BREAK",
    groupUuid,
    groupType: "PAGE_BREAK",
  };
}

// ---------------------------------------------------------------------------
// createTallyForm — generates a Tally form for a campaign
// ---------------------------------------------------------------------------
export async function createTallyForm(
  campaignId: string
): Promise<ActionResult<{ formUrl: string; formId: string }>> {
  const apiKey = env.TALLY_API_KEY;
  if (!apiKey) {
    return { success: false, error: "TALLY_API_KEY no configurada" };
  }

  const supabase = await createClient();

  // Check if form already exists
  const { data: existingMapping } = await supabase
    .from("tally_form_mappings")
    .select("tally_form_url, tally_form_id")
    .eq("campaign_id", campaignId)
    .limit(1)
    .maybeSingle();

  if (existingMapping) {
    return {
      success: true,
      data: { formUrl: existingMapping.tally_form_url, formId: existingMapping.tally_form_id },
    };
  }

  // Load campaign + org + instrument
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, organizations(name, departments, brand_config)")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { success: false, error: "Campaña no encontrada" };
  }

  const org = campaign.organizations as unknown as {
    name: string;
    departments: Array<{ name: string; headcount: number | null }> | null;
    brand_config: Record<string, unknown> | null;
  } | null;

  // Load dimensions + items for base instrument + modules
  const allInstrumentIds = [campaign.instrument_id, ...(campaign.module_instrument_ids ?? [])];
  const { data: dimensions } = await supabase
    .from("dimensions")
    .select("*, items(*)")
    .in("instrument_id", allInstrumentIds)
    .order("sort_order", { ascending: true });

  if (!dimensions || dimensions.length === 0) {
    return { success: false, error: "No se encontraron dimensiones para el instrumento" };
  }

  // Build form blocks and collect mappings
  const blocks: TallyBlock[] = [];
  const mappings: FieldMapping[] = [];

  // --- Page 1: Welcome + Demographics ---
  const welcomeGroup = makePageGroup();

  blocks.push(
    formTitleBlock(
      welcomeGroup,
      `Encuesta de Clima Organizacional`,
      `${org?.name ?? ""} — Tu participación es anónima y confidencial.`
    )
  );

  // Hidden field: campaign_id
  const hiddenCampaign = hiddenFieldBlock(welcomeGroup, "campaign_id");
  blocks.push(hiddenCampaign.block);

  // Department
  const targetDepts = (campaign as { target_departments?: string[] | null }).target_departments;
  const allDeptNames = (org?.departments ?? []).map((d) => d.name);
  const deptOptions =
    targetDepts && targetDepts.length > 0
      ? allDeptNames.filter((name) => targetDepts.includes(name))
      : allDeptNames;

  if (deptOptions.length > 0) {
    const dept = multipleChoiceBlock(
      welcomeGroup,
      "¿A qué departamento perteneces?",
      deptOptions.map((d) => ({ label: d, value: d }))
    );
    blocks.push(dept.block);
    mappings.push({
      tally_field_key: dept.fieldKey,
      target_type: "demographic",
      target_id: null,
      target_meta: "department",
    });
  }

  // Tenure
  const tenure = multipleChoiceBlock(
    welcomeGroup,
    "¿Cuánto tiempo llevas en la organización?",
    TENURE_OPTIONS
  );
  blocks.push(tenure.block);
  mappings.push({
    tally_field_key: tenure.fieldKey,
    target_type: "demographic",
    target_id: null,
    target_meta: "tenure",
  });

  // Gender
  const gender = multipleChoiceBlock(welcomeGroup, "Género", GENDER_OPTIONS);
  blocks.push(gender.block);
  mappings.push({
    tally_field_key: gender.fieldKey,
    target_type: "demographic",
    target_id: null,
    target_meta: "gender",
  });

  blocks.push(pageBreakBlock(welcomeGroup));

  // --- Pages 2-N: Dimensions ---
  for (const dim of dimensions) {
    const dimGroup = makePageGroup();
    blocks.push(titleBlock(dimGroup, dim.name));

    const sortedItems = [...dim.items].sort((a, b) => a.sort_order - b.sort_order);

    for (const item of sortedItems) {
      const ls = linearScaleBlock(dimGroup, item.text, 1, 5, LIKERT_LABELS[1], LIKERT_LABELS[5]);
      blocks.push(ls.block);
      mappings.push({
        tally_field_key: ls.fieldKey,
        target_type: "item",
        target_id: item.id,
        target_meta: null,
      });
    }

    blocks.push(pageBreakBlock(dimGroup));
  }

  // --- Final Page: Open questions + eNPS ---
  const finalGroup = makePageGroup();
  blocks.push(titleBlock(finalGroup, "Preguntas abiertas"));

  const q1 = textareaBlock(
    finalGroup,
    "¿Cuál consideras que es la mayor fortaleza de la organización?",
    false
  );
  blocks.push(q1.block);
  mappings.push({
    tally_field_key: q1.fieldKey,
    target_type: "open_response",
    target_id: null,
    target_meta: "strength",
  });

  const q2 = textareaBlock(
    finalGroup,
    "¿Qué aspecto consideras que la organización debería mejorar?",
    false
  );
  blocks.push(q2.block);
  mappings.push({
    tally_field_key: q2.fieldKey,
    target_type: "open_response",
    target_id: null,
    target_meta: "improvement",
  });

  const q3 = textareaBlock(finalGroup, "¿Hay algo más que quieras compartir?", false);
  blocks.push(q3.block);
  mappings.push({
    tally_field_key: q3.fieldKey,
    target_type: "open_response",
    target_id: null,
    target_meta: "general",
  });

  const enps = linearScaleBlock(
    finalGroup,
    "En una escala de 0 a 10, ¿qué tan probable es que recomiendes esta organización como un lugar para trabajar?",
    0,
    10,
    "Nada probable",
    "Muy probable"
  );
  blocks.push(enps.block);
  mappings.push({
    tally_field_key: enps.fieldKey,
    target_type: "enps",
    target_id: null,
    target_meta: null,
  });

  // --- Build theme from brand_config ---
  const brandConfig = org?.brand_config as Record<string, string> | null;
  const settings: Record<string, unknown> = {
    language: "es",
    redirectUrl: `${env.NEXT_PUBLIC_SITE_URL}/survey/thanks`,
  };

  if (brandConfig) {
    settings.theme = {
      ...(brandConfig.primaryColor && { accent: brandConfig.primaryColor }),
      ...(brandConfig.primaryColor && { button: brandConfig.primaryColor }),
    };
  }

  // --- Create form in Tally ---
  const createRes = await fetch(`${TALLY_API}/forms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      status: "PUBLISHED",
      blocks,
      settings,
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    return {
      success: false,
      error: `Error creando formulario en Tally (${createRes.status}): ${body.slice(0, 300)}`,
    };
  }

  const formData = await createRes.json();
  const formId: string = formData.id;
  const formUrl = `https://tally.so/r/${formId}`;

  // --- Configure webhook ---
  const webhookSecret = env.TALLY_WEBHOOK_SECRET ?? randomUUID();
  const webhookUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/tally`;

  const webhookRes = await fetch(`${TALLY_API}/webhooks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      formId,
      url: webhookUrl,
      eventTypes: ["FORM_RESPONSE"],
      signingSecret: webhookSecret,
    }),
  });

  if (!webhookRes.ok) {
    const body = await webhookRes.text().catch(() => "");
    console.error("Failed to create Tally webhook:", body);
    // Don't fail — form was created, webhook can be configured manually
  }

  // --- Save mappings ---
  const mappingRows = mappings.map((m) => ({
    campaign_id: campaignId,
    tally_form_id: formId,
    tally_form_url: formUrl,
    tally_field_key: m.tally_field_key,
    target_type: m.target_type,
    target_id: m.target_id,
    target_meta: m.target_meta,
  }));

  const { error: insertError } = await supabase.from("tally_form_mappings").insert(mappingRows);

  if (insertError) {
    return { success: false, error: `Error guardando mappings: ${insertError.message}` };
  }

  return { success: true, data: { formUrl, formId } };
}

// ---------------------------------------------------------------------------
// getTallyFormUrl — retrieve form URL for a campaign
// ---------------------------------------------------------------------------
export async function getTallyFormUrl(
  campaignId: string
): Promise<ActionResult<{ formUrl: string; formId: string } | null>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tally_form_mappings")
    .select("tally_form_url, tally_form_id")
    .eq("campaign_id", campaignId)
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: { formUrl: data.tally_form_url, formId: data.tally_form_id },
  };
}

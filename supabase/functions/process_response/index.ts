declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey =
  Deno.env.get("PROCESS_RESPONSE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const hookSecret = Deno.env.get("PROCESS_RESPONSE_HOOK_SECRET") ?? "";
const textEncoder = new TextEncoder();

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

type ProcessResponsePayload = {
  record?: {
    respondent_id?: string;
  };
};

type RespondentLookupRow = {
  campaign_id: string | null;
  status: string | null;
  completed_at: string | null;
};

function safeEqual(left: string, right: string) {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);

  if (leftBytes.length === 0 || leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }

  return diff === 0;
}

async function querySupabaseJson<T extends JsonValue>(path: string, init: RequestInit): Promise<T> {
  const authHeaders: Record<string, string> = {
    apikey: serviceRoleKey,
    "Content-Type": "application/json",
  };

  // Secret keys should travel only in `apikey`; JWT-based legacy keys still need Authorization.
  if (serviceRoleKey && !serviceRoleKey.startsWith("sb_secret_")) {
    authHeaders.Authorization = `Bearer ${serviceRoleKey}`;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase REST error (${response.status})`);
  }

  return (await response.json()) as T;
}

function jsonResponse(body: JsonValue, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método no permitido" }, 405);
  }

  try {
    if (!hookSecret) {
      throw new Error("PROCESS_RESPONSE_HOOK_SECRET no configurada");
    }

    const providedSecret = request.headers.get("x-hook-secret") ?? "";
    if (!safeEqual(providedSecret, hookSecret)) {
      return jsonResponse({ ok: false, error: "Hook secret inválida" }, 401);
    }

    const payload = (await request.json()) as ProcessResponsePayload;
    const record = payload.record;
    const respondentId = record?.respondent_id;

    if (!respondentId) {
      return jsonResponse({ ok: false, error: "respondent_id requerido" }, 400);
    }

    const respondents = await querySupabaseJson<RespondentLookupRow[]>(
      `respondents?id=eq.${respondentId}&select=campaign_id,status,completed_at`,
      { method: "GET" }
    );
    const respondent = respondents[0];

    if (!respondent?.campaign_id) {
      throw new Error("Respondente no encontrado");
    }

    if (respondent.status !== "completed" || !respondent.completed_at) {
      return jsonResponse(
        {
          ok: true,
          skipped: true,
          reason: "respondent_incomplete",
          campaignId: respondent.campaign_id,
        },
        202
      );
    }

    const refreshedRows = await querySupabaseJson<number>("rpc/refresh_campaign_stats", {
      method: "POST",
      body: JSON.stringify({
        p_campaign_id: respondent.campaign_id,
      }),
    });

    return jsonResponse({ ok: true, campaignId: respondent.campaign_id, refreshedRows }, 200);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Edge function error",
      },
      500
    );
  }
});

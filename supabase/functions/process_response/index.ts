// @ts-nocheck
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey =
  Deno.env.get("PROCESS_RESPONSE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const hookSecret = Deno.env.get("PROCESS_RESPONSE_HOOK_SECRET") ?? "";
const textEncoder = new TextEncoder();

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

async function querySupabase(path: string, init: RequestInit) {
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

  return response;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (!hookSecret) {
      throw new Error("PROCESS_RESPONSE_HOOK_SECRET no configurada");
    }

    const providedSecret = request.headers.get("x-hook-secret") ?? "";
    if (!safeEqual(providedSecret, hookSecret)) {
      return new Response(JSON.stringify({ ok: false, error: "Hook secret inválida" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await request.json();
    const record = payload.record as { respondent_id?: string } | undefined;
    const respondentId = record?.respondent_id;

    if (!respondentId) {
      return new Response(JSON.stringify({ ok: false, error: "respondent_id requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const respondentResponse = await querySupabase(
      `respondents?id=eq.${respondentId}&select=campaign_id,status,completed_at`,
      { method: "GET" }
    );
    const respondents = (await respondentResponse.json()) as Array<{
      campaign_id: string;
      status: string | null;
      completed_at: string | null;
    }>;
    const respondent = respondents[0];

    if (!respondent?.campaign_id) {
      throw new Error("Respondente no encontrado");
    }

    if (respondent.status !== "completed" || !respondent.completed_at) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "respondent_incomplete",
          campaignId: respondent.campaign_id,
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const refreshResponse = await querySupabase("rpc/refresh_campaign_stats", {
      method: "POST",
      body: JSON.stringify({
        p_campaign_id: respondent.campaign_id,
      }),
    });
    const refreshedRows = await refreshResponse.json();

    return new Response(
      JSON.stringify({ ok: true, campaignId: respondent.campaign_id, refreshedRows }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Edge function error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

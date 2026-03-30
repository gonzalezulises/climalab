import { NextResponse } from "next/server";
import { getPlatformOperationsOverview } from "@/actions/pipeline-ops";
import { assertCronSecret } from "@/lib/cron-auth";
import { env } from "@/lib/env";
import { createAdminClient, getAdminClientRuntimeInfo } from "@/lib/supabase/admin";
import { resolveAdminSupabaseKey } from "@/lib/supabase/admin-config";

async function runRestProbe(mode: "apikey_only" | "apikey_and_bearer", adminKey: string) {
  const headers = new Headers({
    apikey: adminKey,
  });

  if (mode === "apikey_and_bearer") {
    headers.set("Authorization", `Bearer ${adminKey}`);
  }

  const response = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/campaigns?select=id&limit=1`,
    { headers }
  );

  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: text.slice(0, 300),
  };
}

export async function GET(request: Request) {
  try {
    assertCronSecret(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Credenciales inválidas" },
      { status: 401 }
    );
  }

  const runtime = getAdminClientRuntimeInfo();
  const adminKey = resolveAdminSupabaseKey({
    SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  });

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("campaigns").select("id").limit(1);
    const operationsOverview = await getPlatformOperationsOverview();
    const restApikeyOnly = adminKey ? await runRestProbe("apikey_only", adminKey) : null;
    const restApikeyAndBearer = adminKey ? await runRestProbe("apikey_and_bearer", adminKey) : null;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          runtime,
          queryOk: false,
          error: error.message,
          probes: {
            restApikeyOnly,
            restApikeyAndBearer,
            operationsOverview: {
              ok: false,
              error: error.message,
            },
          },
        },
        { status: 500 }
      );
    }

    const operationsProbe = operationsOverview.success
      ? (() => {
          try {
            JSON.stringify(operationsOverview.data);
            return {
              ok: true,
              batchRuns: operationsOverview.data.latestBatchRuns.length,
              notifications: operationsOverview.data.latestNotifications.length,
              backfillRuns: operationsOverview.data.latestBackfillRuns.length,
              backfillCandidates: operationsOverview.data.backfillCandidates.length,
              jsonSerializable: true,
            };
          } catch (probeError) {
            return {
              ok: false,
              error: probeError instanceof Error ? probeError.message : "JSON serialization failed",
              jsonSerializable: false,
            };
          }
        })()
      : {
          ok: false,
          error: operationsOverview.error,
          jsonSerializable: false,
        };

    return NextResponse.json({
      ok: true,
      runtime,
      queryOk: true,
      probes: {
        restApikeyOnly,
        restApikeyAndBearer,
        operationsOverview: operationsProbe,
      },
    });
  } catch (error) {
    const restApikeyOnly = adminKey ? await runRestProbe("apikey_only", adminKey) : null;
    const restApikeyAndBearer = adminKey ? await runRestProbe("apikey_and_bearer", adminKey) : null;
    return NextResponse.json(
      {
        ok: false,
        runtime,
        queryOk: false,
        error: error instanceof Error ? error.message : "No se pudo crear el admin client",
        probes: {
          restApikeyOnly,
          restApikeyAndBearer,
        },
      },
      { status: 500 }
    );
  }
}

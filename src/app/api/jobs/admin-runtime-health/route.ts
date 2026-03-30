import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron-auth";
import { createAdminClient, getAdminClientRuntimeInfo } from "@/lib/supabase/admin";

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

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("campaigns").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          runtime,
          queryOk: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      runtime,
      queryOk: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        runtime,
        queryOk: false,
        error: error instanceof Error ? error.message : "No se pudo crear el admin client",
      },
      { status: 500 }
    );
  }
}

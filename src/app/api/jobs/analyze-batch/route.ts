import { NextResponse } from "next/server";
import { analyzeBatchCampaigns } from "@/jobs/analyzeBatch";
import { assertCronSecret } from "@/lib/cron-auth";

export async function GET(request: Request) {
  try {
    assertCronSecret(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Credenciales inválidas" },
      { status: 401 }
    );
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const hoursParam = searchParams.get("hours");
    const sourceParam = searchParams.get("source");
    const hours = hoursParam ? Number(hoursParam) : 24;

    if (!Number.isFinite(hours) || hours <= 0) {
      return NextResponse.json({ error: "hours debe ser un entero positivo" }, { status: 400 });
    }

    const triggerSource =
      sourceParam === "manual" || sourceParam === "response_hook" ? sourceParam : "cron";
    const result = await analyzeBatchCampaigns(hours, triggerSource);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo ejecutar el batch" },
      { status: 500 }
    );
  }
}

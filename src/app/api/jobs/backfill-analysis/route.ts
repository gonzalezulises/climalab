import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron-auth";
import { backfillCampaignAnalyses, getBackfillCandidates } from "@/jobs/backfillAnalysis";

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
    const limit = Number(searchParams.get("limit") ?? "25");
    const force = searchParams.get("force") === "true";
    const organizationId = searchParams.get("organizationId") || undefined;

    const candidates = await getBackfillCandidates({ limit, force, organizationId });
    return NextResponse.json({
      ok: true,
      targetLogicVersion:
        candidates.length > 0 ? (candidates[0]?.latestLogicVersion ?? null) : null,
      candidates,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo listar backfills" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    assertCronSecret(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Credenciales inválidas" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await backfillCampaignAnalyses({
      campaignIds: Array.isArray(body.campaignIds) ? body.campaignIds : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      force: body.force === true,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo ejecutar el backfill" },
      { status: 500 }
    );
  }
}

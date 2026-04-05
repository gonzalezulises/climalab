import { NextResponse } from "next/server";
import { assertIngestSecret } from "@/lib/ingest-auth";
import { resolveIngestContractVersion } from "@/lib/ingest-contract";
import { normalizeResponse } from "@/lib/normalizeResponse";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = await rateLimit(`ingest-webhook:${ip}`, {
      limit: 100,
      windowMs: 60_000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    assertIngestSecret(request);
    const body = await request.json();
    const contractVersion = resolveIngestContractVersion({
      headerVersion: request.headers.get("x-climalab-contract-version"),
      bodyVersion: body?.contractVersion,
    });
    const result = await normalizeResponse({
      ...body,
      source: "webhook",
      contractVersion,
    });

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      respondentId: "respondentId" in result ? result.respondentId : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar el webhook" },
      { status: 400 }
    );
  }
}

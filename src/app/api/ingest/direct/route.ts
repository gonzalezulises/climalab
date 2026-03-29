import { NextResponse } from "next/server";
import { assertIngestSecret } from "@/lib/ingest-auth";
import { normalizeResponse } from "@/lib/normalizeResponse";

export async function POST(request: Request) {
  try {
    assertIngestSecret(request);
    const body = await request.json();
    const result = await normalizeResponse({
      ...body,
      source: "api",
    });

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      respondentId: "respondentId" in result ? result.respondentId : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo ingerir la respuesta" },
      { status: 400 }
    );
  }
}

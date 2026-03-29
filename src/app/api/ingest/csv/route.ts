import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { assertIngestSecret } from "@/lib/ingest-auth";
import { normalizeResponse } from "@/lib/normalizeResponse";

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("El CSV debe tener encabezados y al menos una fila");
  }

  const headers = lines[0].split(",").map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
}

export async function POST(request: Request) {
  try {
    assertIngestSecret(request);
    const formData = await request.formData();
    const campaignId = String(formData.get("campaignId") ?? "").trim();
    const file = formData.get("file");

    if (!campaignId) {
      throw new Error("campaignId es requerido");
    }

    if (!(file instanceof File)) {
      throw new Error("Debe adjuntar un archivo CSV");
    }

    const rows = parseCsv(await file.text());
    let imported = 0;
    let duplicates = 0;

    for (const row of rows) {
      const responses = Object.entries(row)
        .filter(([key, value]) => key.startsWith("item:") && value !== "")
        .map(([key, value]) => ({
          itemId: key.replace("item:", ""),
          score: Number(value),
        }));

      const openResponses = [
        row["open:strength"]
          ? { questionType: "strength" as const, text: row["open:strength"] }
          : null,
        row["open:improvement"]
          ? { questionType: "improvement" as const, text: row["open:improvement"] }
          : null,
        row["open:general"]
          ? { questionType: "general" as const, text: row["open:general"] }
          : null,
      ].filter(Boolean) as Array<{
        questionType: "strength" | "improvement" | "general";
        text: string;
      }>;

      const result = await normalizeResponse({
        source: "csv",
        externalEventId: row.external_event_id || `csv-${randomUUID()}`,
        campaignId,
        startedAt: row.started_at || undefined,
        completedAt: row.completed_at || undefined,
        demographics: {
          department: row.department || null,
          tenure: row.tenure || null,
          gender: row.gender || null,
        },
        responses,
        openResponses,
        enpsScore: row.enps_score ? Number(row.enps_score) : null,
      });

      if (result.duplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    return NextResponse.json({ ok: true, imported, duplicates, total: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar el CSV" },
      { status: 400 }
    );
  }
}

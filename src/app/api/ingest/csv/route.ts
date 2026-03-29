import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { assertIngestSecret } from "@/lib/ingest-auth";
import { normalizeResponse } from "@/lib/normalizeResponse";

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index++;
      }
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.some((value) => value !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    throw new Error("El CSV contiene comillas sin cerrar");
  }

  currentRow.push(currentField);
  if (currentRow.some((value) => value !== "")) {
    rows.push(currentRow);
  }

  if (rows.length < 2) {
    throw new Error("El CSV debe tener encabezados y al menos una fila");
  }

  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((row, rowIndex) => {
    if (row.length > headers.length) {
      throw new Error(`La fila ${rowIndex + 2} tiene más columnas que el encabezado`);
    }

    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = (row[index] ?? "").trim();
      return acc;
    }, {});
  });
}

function buildDeterministicEventId(campaignId: string, row: Record<string, string>) {
  return `csv-${createHash("sha256")
    .update(`${campaignId}:${JSON.stringify(row)}`)
    .digest("hex")
    .slice(0, 24)}`;
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
        externalEventId: row.external_event_id || buildDeterministicEventId(campaignId, row),
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

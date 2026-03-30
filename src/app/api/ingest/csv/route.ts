import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { assertIngestSecret } from "@/lib/ingest-auth";
import { parseCsv } from "@/lib/csv-ingest";
import { INGEST_CONTRACT_VERSION, resolveIngestContractVersion } from "@/lib/ingest-contract";
import { normalizeResponse } from "@/lib/normalizeResponse";
import { rateLimit } from "@/lib/rate-limit";

function validateCsvHeaders(headers: string[]) {
  const allowedHeaders = new Set([
    "external_event_id",
    "external_subject_id",
    "mapping_version",
    "started_at",
    "completed_at",
    "department",
    "tenure",
    "gender",
    "enps_score",
    "open:strength",
    "open:improvement",
    "open:general",
  ]);

  const itemHeaders = headers.filter((header) => header.startsWith("item:"));
  if (itemHeaders.length === 0) {
    throw new Error("El CSV debe incluir al menos una columna item:<uuid>");
  }

  const invalidHeaders = headers.filter(
    (header) => !allowedHeaders.has(header) && !header.startsWith("item:")
  );

  if (invalidHeaders.length > 0) {
    throw new Error(`Encabezados CSV no soportados: ${invalidHeaders.join(", ")}`);
  }
}

export function mapCsvRowToSubmission(input: {
  row: Record<string, string>;
  campaignId: string;
  rowNumber: number;
  contractVersion: string;
}) {
  return {
    source: "csv" as const,
    contractVersion: input.contractVersion,
    externalEventId:
      input.row.external_event_id || buildDeterministicEventId(input.campaignId, input.row),
    externalSubjectId: input.row.external_subject_id || undefined,
    campaignId: input.campaignId,
    mappingVersion: input.row.mapping_version || undefined,
    startedAt: input.row.started_at || undefined,
    completedAt: input.row.completed_at || undefined,
    metadata: {
      ingestion_mode: "csv_upload",
      row_number: input.rowNumber,
    },
    demographics: {
      department: input.row.department || null,
      tenure: input.row.tenure || null,
      gender: input.row.gender || null,
    },
    responses: Object.entries(input.row)
      .filter(([key, value]) => key.startsWith("item:") && value !== "")
      .map(([key, value]) => ({
        itemId: key.replace("item:", ""),
        score: Number(value),
      })),
    openResponses: [
      input.row["open:strength"]
        ? { questionType: "strength" as const, text: input.row["open:strength"] }
        : null,
      input.row["open:improvement"]
        ? { questionType: "improvement" as const, text: input.row["open:improvement"] }
        : null,
      input.row["open:general"]
        ? { questionType: "general" as const, text: input.row["open:general"] }
        : null,
    ].filter(Boolean) as Array<{
      questionType: "strength" | "improvement" | "general";
      text: string;
    }>,
    enpsScore: input.row.enps_score ? Number(input.row.enps_score) : null,
  };
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = rateLimit(`ingest-csv:${ip}`, { limit: 100, windowMs: 60_000 });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    assertIngestSecret(request);
    const contractVersion = resolveIngestContractVersion({
      headerVersion: request.headers.get("x-climalab-contract-version"),
      bodyVersion: INGEST_CONTRACT_VERSION,
    });
    const formData = await request.formData();
    const campaignId = String(formData.get("campaignId") ?? "").trim();
    const file = formData.get("file");

    if (!campaignId) {
      throw new Error("campaignId es requerido");
    }

    if (!(file instanceof File)) {
      throw new Error("Debe adjuntar un archivo CSV");
    }

    const parsed = parseCsv(await file.text());
    validateCsvHeaders(parsed.headers);
    let imported = 0;
    let duplicates = 0;
    const errors: Array<{ rowNumber: number; error: string }> = [];

    for (const [index, row] of parsed.rows.entries()) {
      const rowNumber = index + 2;

      try {
        const result = await normalizeResponse(
          mapCsvRowToSubmission({
            row,
            campaignId,
            rowNumber,
            contractVersion,
          })
        );

        if (result.duplicate) {
          duplicates++;
        } else {
          imported++;
        }
      } catch (error) {
        errors.push({
          rowNumber,
          error: error instanceof Error ? error.message : "No se pudo procesar la fila",
        });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      contractVersion,
      imported,
      duplicates,
      failed: errors.length,
      total: parsed.rows.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar el CSV" },
      { status: 400 }
    );
  }
}
function buildDeterministicEventId(campaignId: string, row: Record<string, string>) {
  return `csv-${createHash("sha256")
    .update(`${campaignId}:${JSON.stringify(row)}`)
    .digest("hex")
    .slice(0, 24)}`;
}

"use server";

import type { ActionResult } from "@/types";

type ParsedDepartment = { name: string; headcount: number | null };

const SYSTEM_PROMPT = `Eres un asistente que extrae datos de departamentos organizacionales.
El usuario te enviará texto en cualquier formato (CSV, tabla, lista, texto libre, etc.) que contiene nombres de departamentos y opcionalmente la cantidad de personas en cada uno.

Tu tarea es extraer la información y devolver ÚNICAMENTE un JSON array válido, sin markdown ni explicaciones.

Reglas:
- Cada elemento debe tener: {"name": "string", "headcount": number | null}
- Si no se menciona cantidad, usa null
- Normaliza los nombres (primera letra mayúscula, sin abreviaciones extrañas)
- Combina duplicados sumando headcount
- Ignora encabezados, totales, y líneas vacías
- Si el texto no contiene departamentos, devuelve []

Ejemplo de salida:
[{"name": "Ingeniería", "headcount": 45}, {"name": "Marketing", "headcount": null}]`;

export async function parseDepartmentsWithAI(
  rawText: string
): Promise<ActionResult<ParsedDepartment[]>> {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL || "qwen2.5:72b";

  if (!baseUrl) {
    return { success: false, error: "OLLAMA_BASE_URL no configurado" };
  }

  if (!rawText.trim()) {
    return { success: false, error: "Texto vacío" };
  }

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: rawText },
        ],
        stream: false,
        options: { temperature: 0.1, num_predict: 2048 },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Error del modelo (${response.status})`,
      };
    }

    const data = await response.json();
    const content: string = data?.message?.content ?? "";

    // Extract JSON from response (may have markdown fences)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: false, error: "El modelo no devolvió datos válidos" };
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      return { success: false, error: "Formato de respuesta inesperado" };
    }

    const departments: ParsedDepartment[] = parsed
      .filter(
        (item: unknown): item is { name: string; headcount?: number | null } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { name?: unknown }).name === "string"
      )
      .map((item) => ({
        name: item.name.trim(),
        headcount:
          typeof item.headcount === "number" ? item.headcount : null,
      }))
      .filter((d) => d.name.length > 0);

    return { success: true, data: departments };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: false, error: "El modelo devolvió JSON inválido" };
    }
    const message =
      err instanceof Error ? err.message : "Error de conexión con el modelo";
    return { success: false, error: message };
  }
}

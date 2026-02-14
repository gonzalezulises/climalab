"use server";

import type { ActionResult } from "@/types";

type ParsedParticipant = { name: string; email: string; department?: string };

const SYSTEM_PROMPT = `Eres un asistente que extrae datos de participantes de encuestas organizacionales.
El usuario te enviará texto en cualquier formato (CSV, tabla, lista, texto libre, correo, etc.) que contiene nombres y correos electrónicos de personas, y opcionalmente su departamento.

Tu tarea es extraer la información y devolver ÚNICAMENTE un JSON array válido, sin markdown ni explicaciones.

Reglas:
- Cada elemento debe tener: {"name": "string", "email": "string", "department": "string" | undefined}
- El email debe ser válido (contener @)
- Normaliza los nombres (primera letra mayúscula de cada palabra)
- Si no se menciona departamento, omite el campo
- Ignora encabezados, totales, y líneas vacías
- Si el texto no contiene participantes válidos, devuelve []
- No inventes datos — solo extrae lo que está en el texto

Ejemplo de salida:
[{"name": "María García", "email": "maria@empresa.com", "department": "Ventas"}, {"name": "Juan López", "email": "juan@empresa.com"}]`;

export async function parseParticipantsWithAI(
  rawText: string
): Promise<ActionResult<ParsedParticipant[]>> {
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
        options: { temperature: 0.1, num_predict: 4096 },
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

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: false, error: "El modelo no devolvió datos válidos" };
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      return { success: false, error: "Formato de respuesta inesperado" };
    }

    const participants: ParsedParticipant[] = parsed
      .filter(
        (item: unknown): item is { name: string; email: string; department?: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { name?: unknown }).name === "string" &&
          typeof (item as { email?: unknown }).email === "string" &&
          (item as { email: string }).email.includes("@")
      )
      .map((item) => ({
        name: item.name.trim(),
        email: item.email.trim().toLowerCase(),
        ...(typeof item.department === "string" && item.department.trim()
          ? { department: item.department.trim() }
          : {}),
      }))
      .filter((p) => p.name.length > 0 && p.email.length > 0);

    return { success: true, data: participants };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: false, error: "El modelo devolvió JSON inválido" };
    }
    const message =
      err instanceof Error ? err.message : "Error de conexión con el modelo";
    return { success: false, error: message };
  }
}

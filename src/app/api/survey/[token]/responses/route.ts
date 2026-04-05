import { NextResponse } from "next/server";
import { saveSurveyResponses } from "@/lib/survey-session";
import { surveyResponsesSchema } from "@/lib/validations/survey";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const raw = await request.json();
    const parsed = surveyResponsesSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 }
      );
    }

    await saveSurveyResponses(token, parsed.data.items);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron guardar las respuestas" },
      { status: 400 }
    );
  }
}

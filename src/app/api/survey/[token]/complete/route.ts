import { NextResponse } from "next/server";
import { completeSurveySession } from "@/lib/survey-session";
import { surveyCompleteSchema } from "@/lib/validations/survey";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const raw = await request.json();
    const parsed = surveyCompleteSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 }
      );
    }

    await completeSurveySession({
      token,
      enpsScore: parsed.data.enpsScore ?? null,
      openResponses: parsed.data.openResponses ?? [],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo finalizar la encuesta" },
      { status: 400 }
    );
  }
}

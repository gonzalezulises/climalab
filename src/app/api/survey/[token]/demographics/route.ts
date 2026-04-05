import { NextResponse } from "next/server";
import { saveSurveyDemographics } from "@/lib/survey-session";
import { surveyDemographicsSchema } from "@/lib/validations/survey";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const raw = await request.json();
    const parsed = surveyDemographicsSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 }
      );
    }

    await saveSurveyDemographics(token, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron guardar los datos" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { startSurveySession } from "@/lib/survey-session";

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    await startSurveySession(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar la encuesta" },
      { status: 400 }
    );
  }
}

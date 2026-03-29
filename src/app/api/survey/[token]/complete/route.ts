import { NextResponse } from "next/server";
import { completeSurveySession } from "@/lib/survey-session";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const body = (await request.json()) as {
      enpsScore?: number | null;
      openResponses?: Array<{ questionType: "strength" | "improvement" | "general"; text: string }>;
    };

    await completeSurveySession({
      token,
      enpsScore: body.enpsScore ?? null,
      openResponses: body.openResponses ?? [],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo finalizar la encuesta" },
      { status: 400 }
    );
  }
}

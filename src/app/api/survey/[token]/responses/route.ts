import { NextResponse } from "next/server";
import { saveSurveyResponses } from "@/lib/survey-session";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const body = (await request.json()) as {
      items: Array<{ itemId: string; score: number }>;
    };

    await saveSurveyResponses(token, body.items);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron guardar las respuestas" },
      { status: 400 }
    );
  }
}

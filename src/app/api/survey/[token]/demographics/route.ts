import { NextResponse } from "next/server";
import { saveSurveyDemographics } from "@/lib/survey-session";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const body = (await request.json()) as {
      department: string;
      tenure: string;
      gender?: string | null;
    };

    await saveSurveyDemographics(token, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron guardar los datos" },
      { status: 400 }
    );
  }
}

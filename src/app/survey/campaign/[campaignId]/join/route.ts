import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSurveySession } from "@/lib/survey-session";

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await context.params;
  const admin = createAdminClient();

  const { data: campaign, error } = await admin
    .from("campaigns")
    .select("id, status, starts_at, ends_at")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    return NextResponse.redirect(new URL("/survey/thanks?error=campaign-not-found", _request.url));
  }

  const now = new Date();
  const isUnavailable =
    campaign.status !== "active" ||
    (campaign.starts_at ? new Date(campaign.starts_at) > now : false) ||
    (campaign.ends_at ? new Date(campaign.ends_at) < now : false);

  if (isUnavailable) {
    return NextResponse.redirect(new URL(`/survey/campaign/${campaignId}`, _request.url));
  }

  const session = await createSurveySession(campaignId);
  const cookieStore = await cookies();
  cookieStore.set(`climalab_respondent_${campaignId}`, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });

  return NextResponse.redirect(new URL(`/survey/${session.token}`, _request.url));
}

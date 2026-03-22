import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Validate campaign exists and is active
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status, starts_at, ends_at")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return <ErrorPage message="Campaña no encontrada" />;
  }

  if (campaign.status !== "active") {
    return <ErrorPage message="Esta encuesta no está activa en este momento." />;
  }

  const now = new Date();
  if (campaign.starts_at && new Date(campaign.starts_at) > now) {
    return <ErrorPage message="Esta encuesta aún no ha iniciado." />;
  }
  if (campaign.ends_at && new Date(campaign.ends_at) < now) {
    return <ErrorPage message="Esta encuesta ha finalizado." />;
  }

  // Check cookie for existing respondent to prevent duplicates
  const cookieStore = await cookies();
  const cookieKey = `climalab_respondent_${campaignId}`;
  const existingToken = cookieStore.get(cookieKey)?.value;

  if (existingToken) {
    // Verify respondent still exists and isn't completed
    const { data: existing } = await supabase
      .from("respondents")
      .select("token, status")
      .eq("token", existingToken)
      .single();

    if (existing) {
      if (existing.status === "completed") {
        return <ErrorPage message="Ya completaste esta encuesta. Gracias por tu participación." />;
      }
      redirect(`/survey/${existing.token}`);
    }
  }

  // Create anonymous respondent
  const { data: respondent, error } = await supabase
    .from("respondents")
    .insert({ campaign_id: campaignId })
    .select("token")
    .single();

  if (error || !respondent) {
    return <ErrorPage message="Error al crear tu sesión de encuesta. Intenta de nuevo." />;
  }

  // Set cookie to remember this respondent (expires in 90 days)
  cookieStore.set(cookieKey, respondent.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });

  redirect(`/survey/${respondent.token}`);
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Encuesta no disponible</h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

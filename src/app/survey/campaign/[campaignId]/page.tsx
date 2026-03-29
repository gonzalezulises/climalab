import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const supabase = createAdminClient();

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

  // Redirect to the API route handler that creates the respondent and sets the cookie
  redirect(`/survey/campaign/${campaignId}/join`);
}

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SurveyClient } from "./survey-client";

export const dynamic = "force-dynamic";

async function getSurveyData(token: string) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch respondent by token
  const { data: respondent, error: respondentError } = await supabase
    .from("respondents")
    .select("*")
    .eq("token", token)
    .single();

  if (respondentError || !respondent) {
    return { error: "Enlace no válido" };
  }

  if (respondent.status === "completed") {
    return { error: "completed" };
  }

  // Fetch campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*, organizations(name, logo_url, departments)")
    .eq("id", respondent.campaign_id)
    .single();

  if (campaignError || !campaign) {
    return { error: "Campaña no encontrada" };
  }

  if (campaign.status !== "active") {
    return { error: "Esta encuesta no está activa en este momento." };
  }

  const now = new Date();
  if (campaign.starts_at && new Date(campaign.starts_at) > now) {
    return { error: "Esta encuesta aún no ha iniciado." };
  }
  if (campaign.ends_at && new Date(campaign.ends_at) < now) {
    return { error: "Esta encuesta ha finalizado." };
  }

  // Fetch instrument dimensions and items
  const { data: dimensions, error: dimError } = await supabase
    .from("dimensions")
    .select("*, items(*)")
    .eq("instrument_id", campaign.instrument_id)
    .order("sort_order", { ascending: true });

  if (dimError || !dimensions) {
    return { error: "Error cargando el instrumento" };
  }

  // Fetch existing responses for auto-save recovery
  const { data: rawExistingResponses } = await supabase
    .from("responses")
    .select("item_id, score")
    .eq("respondent_id", respondent.id);

  const existingResponses = (rawExistingResponses ?? [])
    .filter((r): r is typeof r & { score: number } => r.score !== null);

  const org = campaign.organizations as unknown as {
    name: string;
    logo_url: string | null;
    departments: string[];
  } | null;

  return {
    respondent,
    campaign,
    dimensions,
    existingResponses,
    organization: org,
  };
}

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSurveyData(token);

  if ("error" in data) {
    if (data.error === "completed") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-5xl">&#10003;</div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ya completaste esta encuesta
            </h1>
            <p className="text-gray-600">
              Tus respuestas fueron registradas de forma anónima. Gracias por tu
              participación.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Encuesta no disponible
          </h1>
          <p className="text-gray-600">{data.error}</p>
        </div>
      </div>
    );
  }

  return (
    <SurveyClient
      token={token}
      respondentId={data.respondent.id}
      campaignId={data.campaign.id}
      organizationName={data.organization?.name ?? ""}
      logoUrl={data.organization?.logo_url ?? null}
      departments={data.organization?.departments ?? []}
      allowComments={data.campaign.allow_comments}
      dimensions={data.dimensions.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        items: d.items
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            id: item.id,
            text: item.text,
            is_reverse: item.is_reverse,
            is_attention_check: item.is_attention_check,
            sort_order: item.sort_order,
          })),
      }))}
      existingResponses={data.existingResponses}
      respondentStatus={data.respondent.status}
      respondentDemographics={{
        department: data.respondent.department,
        tenure: data.respondent.tenure,
        gender: data.respondent.gender,
      }}
    />
  );
}

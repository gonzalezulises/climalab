"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendSurveyInvitation } from "@/lib/email";
import {
  addParticipantsSchema,
  sendInvitationsSchema,
  removeParticipantSchema,
  type AddParticipantsInput,
  type SendInvitationsInput,
  type RemoveParticipantInput,
} from "@/lib/validations/campaign";
import type { ActionResult, Participant, Respondent } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ParticipantWithStatus = Participant & {
  respondent_status: Respondent["status"] | null;
  respondent_token: string | null;
};

// ---------------------------------------------------------------------------
// getParticipants — list participants with joined respondent status
// ---------------------------------------------------------------------------
export async function getParticipants(
  campaignId: string
): Promise<ActionResult<ParticipantWithStatus[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("participants")
    .select("*, respondents(status, token)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  const mapped: ParticipantWithStatus[] = (data ?? []).map((p) => {
    const resp = p.respondents as unknown as { status: string; token: string } | null;
    return {
      ...p,
      respondents: undefined,
      respondent_status: (resp?.status as Respondent["status"]) ?? null,
      respondent_token: resp?.token ?? null,
    } as ParticipantWithStatus;
  });

  return { success: true, data: mapped };
}

// ---------------------------------------------------------------------------
// addParticipants — creates respondent + participant rows per entry
// ---------------------------------------------------------------------------
export async function addParticipants(
  input: AddParticipantsInput
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const parsed = addParticipantsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { campaign_id, participants } = parsed.data;
  const supabase = await createClient();

  // Check campaign exists and is in draft or active
  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .select("id, status, organization_id")
    .eq("id", campaign_id)
    .single();

  if (campError || !campaign) {
    return { success: false, error: "Campaña no encontrada" };
  }

  if (campaign.status !== "draft" && campaign.status !== "active") {
    return { success: false, error: "Solo se pueden agregar participantes a campañas en borrador o activas" };
  }

  // Fetch existing emails to deduplicate
  const { data: existing } = await supabase
    .from("participants")
    .select("email")
    .eq("campaign_id", campaign_id);

  const existingEmails = new Set((existing ?? []).map((e) => e.email.toLowerCase()));

  const newParticipants = participants.filter(
    (p) => !existingEmails.has(p.email.toLowerCase())
  );

  if (newParticipants.length === 0) {
    return {
      success: true,
      data: { added: 0, skipped: participants.length },
    };
  }

  // Create respondent rows first
  const respondentRows = newParticipants.map(() => ({
    campaign_id,
  }));

  const { data: respondents, error: respError } = await supabase
    .from("respondents")
    .insert(respondentRows)
    .select("id, token");

  if (respError || !respondents) {
    return { success: false, error: respError?.message ?? "Error creando respondentes" };
  }

  // Create participant rows linked to respondents
  const participantRows = newParticipants.map((p, i) => ({
    campaign_id,
    respondent_id: respondents[i].id,
    name: p.name,
    email: p.email,
    department: p.department ?? null,
  }));

  const { error: partError } = await supabase
    .from("participants")
    .insert(participantRows);

  if (partError) {
    return { success: false, error: partError.message };
  }

  revalidatePath(`/campaigns/${campaign_id}`);
  return {
    success: true,
    data: { added: newParticipants.length, skipped: participants.length - newParticipants.length },
  };
}

// ---------------------------------------------------------------------------
// sendInvitations — sends emails via Resend, updates invitation_status
// ---------------------------------------------------------------------------
export async function sendInvitations(
  input: SendInvitationsInput
): Promise<ActionResult<{ sent: number; failed: number }>> {
  const parsed = sendInvitationsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { campaign_id, participant_ids } = parsed.data;
  const supabase = await createClient();

  // Fetch campaign + org info
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, status, organization_id, organizations(name)")
    .eq("id", campaign_id)
    .single();

  if (!campaign) {
    return { success: false, error: "Campaña no encontrada" };
  }

  if (campaign.status !== "draft" && campaign.status !== "active") {
    return { success: false, error: "Solo se pueden enviar invitaciones en campañas en borrador o activas" };
  }

  const orgName = (campaign.organizations as unknown as { name: string })?.name ?? "";

  // Fetch participants with their respondent tokens
  const { data: participants } = await supabase
    .from("participants")
    .select("*, respondents(token)")
    .in("id", participant_ids)
    .eq("campaign_id", campaign_id);

  if (!participants || participants.length === 0) {
    return { success: false, error: "No se encontraron participantes" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let sent = 0;
  let failed = 0;

  for (const participant of participants) {
    const resp = participant.respondents as unknown as { token: string } | null;
    if (!resp?.token) {
      failed++;
      continue;
    }

    const surveyUrl = `${baseUrl}/survey/${resp.token}`;

    const result = await sendSurveyInvitation({
      to: participant.email,
      participantName: participant.name,
      organizationName: orgName,
      campaignName: campaign.name,
      surveyUrl,
    });

    if (result.success) {
      await supabase
        .from("participants")
        .update({
          invitation_status: "sent",
          invited_at: new Date().toISOString(),
        })
        .eq("id", participant.id);
      sent++;
    } else {
      await supabase
        .from("participants")
        .update({ invitation_status: "failed" })
        .eq("id", participant.id);
      failed++;
    }
  }

  revalidatePath(`/campaigns/${campaign_id}`);
  return { success: true, data: { sent, failed } };
}

// ---------------------------------------------------------------------------
// resendInvitation — resend to a single participant
// ---------------------------------------------------------------------------
export async function resendInvitation(
  participantId: string,
  campaignId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  // Fetch participant + campaign info
  const { data: participant } = await supabase
    .from("participants")
    .select("*, respondents(token)")
    .eq("id", participantId)
    .eq("campaign_id", campaignId)
    .single();

  if (!participant) {
    return { success: false, error: "Participante no encontrado" };
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, organization_id, organizations(name)")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { success: false, error: "Campaña no encontrada" };
  }

  const orgName = (campaign.organizations as unknown as { name: string })?.name ?? "";
  const resp = participant.respondents as unknown as { token: string } | null;

  if (!resp?.token) {
    return { success: false, error: "Token de respondente no encontrado" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const surveyUrl = `${baseUrl}/survey/${resp.token}`;

  const result = await sendSurveyInvitation({
    to: participant.email,
    participantName: participant.name,
    organizationName: orgName,
    campaignName: campaign.name,
    surveyUrl,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  await supabase
    .from("participants")
    .update({
      invitation_status: "sent",
      reminded_at: new Date().toISOString(),
      reminder_count: (participant.reminder_count ?? 0) + 1,
    })
    .eq("id", participantId);

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// removeParticipant — deletes participant + linked respondent
// ---------------------------------------------------------------------------
export async function removeParticipant(
  input: RemoveParticipantInput
): Promise<ActionResult<void>> {
  const parsed = removeParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { participant_id, campaign_id } = parsed.data;
  const supabase = await createClient();

  // Check campaign is in draft
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", campaign_id)
    .single();

  if (!campaign) {
    return { success: false, error: "Campaña no encontrada" };
  }

  if (campaign.status !== "draft") {
    return { success: false, error: "Solo se pueden eliminar participantes en campañas en borrador" };
  }

  // Get participant to find respondent_id
  const { data: participant } = await supabase
    .from("participants")
    .select("id, respondent_id")
    .eq("id", participant_id)
    .eq("campaign_id", campaign_id)
    .single();

  if (!participant) {
    return { success: false, error: "Participante no encontrado" };
  }

  // Delete participant first (due to FK)
  await supabase.from("participants").delete().eq("id", participant_id);

  // Delete linked respondent
  if (participant.respondent_id) {
    await supabase.from("respondents").delete().eq("id", participant.respondent_id);
  }

  revalidatePath(`/campaigns/${campaign_id}`);
  return { success: true, data: undefined };
}

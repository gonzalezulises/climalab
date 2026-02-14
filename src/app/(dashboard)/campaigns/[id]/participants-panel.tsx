"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addParticipants,
  removeParticipant,
  sendInvitations,
  resendInvitation,
  type ParticipantWithStatus,
} from "@/actions/participants";
import { ParticipantEditor } from "@/components/participant-editor";

type Props = {
  campaignId: string;
  campaignStatus: string;
  participants: ParticipantWithStatus[];
  departments: string[];
  baseUrl: string;
};

export function ParticipantsPanel({
  campaignId,
  campaignStatus,
  participants,
  departments,
  baseUrl,
}: Props) {
  const router = useRouter();

  return (
    <ParticipantEditor
      participants={participants}
      departments={departments}
      campaignStatus={campaignStatus}
      baseUrl={baseUrl}
      onAdd={async (entries) => {
        const result = await addParticipants({
          campaign_id: campaignId,
          participants: entries,
        });
        if (!result.success) {
          toast.error(result.error);
          return null;
        }
        router.refresh();
        return result.data;
      }}
      onRemove={async (participantId) => {
        const result = await removeParticipant({
          participant_id: participantId,
          campaign_id: campaignId,
        });
        if (!result.success) {
          toast.error(result.error);
          return false;
        }
        router.refresh();
        return true;
      }}
      onSendInvitations={async (participantIds) => {
        const result = await sendInvitations({
          campaign_id: campaignId,
          participant_ids: participantIds,
        });
        if (!result.success) {
          toast.error(result.error);
          return null;
        }
        router.refresh();
        return result.data;
      }}
      onResend={async (participantId) => {
        const result = await resendInvitation(participantId, campaignId);
        if (!result.success) {
          toast.error(result.error);
          return false;
        }
        router.refresh();
        return true;
      }}
    />
  );
}

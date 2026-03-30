"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setCampaignAiInsightStatus } from "@/actions/ai-governance";

export function GovernanceStatusActions({
  campaignId,
  insightType,
  currentStatus,
}: {
  campaignId: string;
  insightType: string;
  currentStatus: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateStatus(status: "approved" | "published" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await setCampaignAiInsightStatus({
        campaignId,
        insightType: insightType as never,
        status,
      });
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={currentStatus === "approved" ? "default" : "outline"}
          onClick={() => updateStatus("approved")}
          disabled={isPending}
        >
          Aprobar
        </Button>
        <Button
          size="sm"
          variant={currentStatus === "published" ? "default" : "outline"}
          onClick={() => updateStatus("published")}
          disabled={isPending}
        >
          Publicar
        </Button>
        <Button
          size="sm"
          variant={currentStatus === "rejected" ? "destructive" : "outline"}
          onClick={() => updateStatus("rejected")}
          disabled={isPending}
        >
          Rechazar
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

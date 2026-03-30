"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  runCampaignCFA,
  runCampaignInvariance,
  runCampaignHLM,
} from "@/actions/statistical-validation";

type Props = {
  campaignId: string;
  respondentCount: number;
};

const CFA_MIN_N = 100;
const HLM_MIN_N = 50;

export function RunAnalysisButtons({ campaignId, respondentCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<{ success: boolean; error?: string }>) {
    setLoading(label);
    setMessage(null);
    const result = await action();
    setLoading(null);
    if (result.success) {
      setMessage(`${label} completado`);
      router.refresh();
    } else {
      setMessage(`Error: ${result.error}`);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null || respondentCount < CFA_MIN_N}
        onClick={() => run("CFA", () => runCampaignCFA(campaignId))}
      >
        {loading === "CFA"
          ? "Ejecutando CFA..."
          : `Ejecutar CFA${respondentCount < CFA_MIN_N ? ` (n≥${CFA_MIN_N})` : ""}`}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null || respondentCount < CFA_MIN_N}
        onClick={() => run("Invariancia", () => runCampaignInvariance(campaignId))}
      >
        {loading === "Invariancia"
          ? "Ejecutando..."
          : `Invariancia${respondentCount < CFA_MIN_N ? ` (n≥${CFA_MIN_N})` : ""}`}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null || respondentCount < HLM_MIN_N}
        onClick={() => run("HLM", () => runCampaignHLM(campaignId))}
      >
        {loading === "HLM"
          ? "Ejecutando HLM..."
          : `HLM${respondentCount < HLM_MIN_N ? ` (n≥${HLM_MIN_N})` : ""}`}
      </Button>
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}

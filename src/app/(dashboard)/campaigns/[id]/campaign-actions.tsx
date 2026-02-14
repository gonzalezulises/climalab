"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateCampaignStatus,
  calculateResults,
} from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import type { Campaign } from "@/types";
import { Play, Lock, Calculator } from "lucide-react";

export function CampaignActions({ campaign, participantCount }: { campaign: Campaign; participantCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (participantCount === 0) {
      toast.error("Agrega al menos un participante antes de activar la campaña.");
      return;
    }
    setLoading(true);
    const result = await updateCampaignStatus({
      id: campaign.id,
      status: "active",
    });
    if (result.success) {
      toast.success("Campaña activada");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleCloseAndCalculate = async () => {
    setLoading(true);
    const statusResult = await updateCampaignStatus({
      id: campaign.id,
      status: "closed",
    });
    if (!statusResult.success) {
      toast.error(statusResult.error);
      setLoading(false);
      return;
    }

    toast.info("Calculando resultados...");
    const calcResult = await calculateResults(campaign.id);
    if (calcResult.success) {
      toast.success("Resultados calculados");
      router.refresh();
    } else {
      toast.error(calcResult.error);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Activate — only in draft */}
      {campaign.status === "draft" && (
        <Button size="sm" onClick={handleActivate} disabled={loading}>
          <Play className="mr-2 h-4 w-4" />
          {loading ? "Activando..." : "Activar"}
        </Button>
      )}

      {/* Close and calculate — only in active */}
      {campaign.status === "active" && (
        <Button size="sm" onClick={handleCloseAndCalculate} disabled={loading}>
          <Lock className="mr-2 h-4 w-4" />
          {loading ? "Procesando..." : "Cerrar y calcular"}
        </Button>
      )}

      {/* Recalculate — only in closed */}
      {campaign.status === "closed" && (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            setLoading(true);
            const result = await calculateResults(campaign.id);
            if (result.success) {
              toast.success("Resultados recalculados");
              router.refresh();
            } else {
              toast.error(result.error);
            }
            setLoading(false);
          }}
          disabled={loading}
        >
          <Calculator className="mr-2 h-4 w-4" />
          {loading ? "Calculando..." : "Recalcular"}
        </Button>
      )}
    </div>
  );
}

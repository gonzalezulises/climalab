"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCampaignStatus, calculateResults } from "@/actions/campaigns";
import { createTallyForm } from "@/actions/tally";
import { Button } from "@/components/ui/button";
import type { Campaign } from "@/types";
import { Play, Lock, Calculator } from "lucide-react";

export function CampaignActions({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);

    let tallyReady = false;
    toast.info("Preparando canal de encuesta...");
    const tallyResult = await createTallyForm(campaign.id);
    if (tallyResult.success) {
      tallyReady = true;
    } else if (tallyResult.error !== "TALLY_API_KEY no configurada") {
      toast.warning(
        `Tally no quedó listo: ${tallyResult.error}. La campaña se activará con el flujo web.`
      );
    }

    const result = await updateCampaignStatus({
      id: campaign.id,
      status: "active",
    });
    if (result.success) {
      toast.success(
        tallyReady
          ? "Campaña activada — formulario de Tally listo"
          : "Campaña activada — flujo web nativo disponible"
      );
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

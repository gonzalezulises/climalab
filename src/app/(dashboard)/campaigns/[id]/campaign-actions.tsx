"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateCampaignStatus,
  generateRespondentLinks,
  calculateResults,
} from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Campaign } from "@/types";
import { Link2, Play, Lock, Calculator } from "lucide-react";

export function CampaignActions({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [linkCount, setLinkCount] = useState(20);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const handleActivate = async () => {
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

  const handleGenerateLinks = async () => {
    setLoading(true);
    const result = await generateRespondentLinks({
      campaign_id: campaign.id,
      count: linkCount,
    });
    if (result.success) {
      toast.success(`${linkCount} enlaces generados`);
      setLinkDialogOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Generate links — available in draft or active */}
      {(campaign.status === "draft" || campaign.status === "active") && (
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Link2 className="mr-2 h-4 w-4" />
              Generar enlaces
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generar enlaces de participación</DialogTitle>
              <DialogDescription>
                Cada enlace permite a un participante responder la encuesta de forma anónima.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cantidad de enlaces</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={linkCount}
                  onChange={(e) => setLinkCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGenerateLinks} disabled={loading}>
                {loading ? "Generando..." : "Generar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

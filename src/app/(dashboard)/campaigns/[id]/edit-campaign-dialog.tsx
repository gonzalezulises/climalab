"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCampaignConfig } from "@/actions/campaigns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import type { Campaign, Instrument } from "@/types";

export function EditCampaignDialog({
  campaign,
  instruments,
}: {
  campaign: Campaign;
  instruments: Instrument[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(campaign.name);
  const [instrumentId, setInstrumentId] = useState(campaign.instrument_id);
  const [selectedModules, setSelectedModules] = useState<string[]>(
    (campaign.module_instrument_ids as string[]) ?? []
  );
  const [startsAt, setStartsAt] = useState(
    campaign.starts_at ? new Date(campaign.starts_at).toISOString().slice(0, 16) : ""
  );
  const [endsAt, setEndsAt] = useState(
    campaign.ends_at ? new Date(campaign.ends_at).toISOString().slice(0, 16) : ""
  );

  const baseInstruments = useMemo(
    () => instruments.filter((i) => i.instrument_type === "base"),
    [instruments]
  );
  const moduleInstruments = useMemo(
    () => instruments.filter((i) => i.instrument_type === "module"),
    [instruments]
  );

  const toggleModule = useCallback((id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    const result = await updateCampaignConfig({
      id: campaign.id,
      name,
      instrument_id: instrumentId,
      module_instrument_ids: selectedModules,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    });

    if (result.success) {
      toast.success("Campaña actualizada");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar campaña</DialogTitle>
          <DialogDescription>Modifica la configuración antes de activar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Instrumento base</Label>
            <Select value={instrumentId} onValueChange={setInstrumentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {baseInstruments.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name} v{inst.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {moduleInstruments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Módulos opcionales</Label>
              <div className="space-y-1">
                {moduleInstruments.map((mod) => (
                  <label key={mod.id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(mod.id)}
                      onChange={() => toggleModule(mod.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{mod.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Inicio</Label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Fin</Label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!name || !instrumentId || loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

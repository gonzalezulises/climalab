"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCampaign } from "@/actions/campaigns";
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
import { Plus } from "lucide-react";
import type { Organization, Instrument } from "@/types";

export function CreateCampaignDialog({
  organizations,
  instruments,
}: {
  organizations: Organization[];
  instruments: Instrument[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");

  const handleSubmit = async () => {
    if (!name || !orgId || !instrumentId) return;

    setLoading(true);
    const result = await createCampaign({
      name,
      organization_id: orgId,
      instrument_id: instrumentId,
    });

    if (result.success) {
      toast.success("Campaña creada");
      setOpen(false);
      setName("");
      setOrgId("");
      setInstrumentId("");
      router.push(`/campaigns/${result.data.id}`);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva campaña
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear campaña</DialogTitle>
          <DialogDescription>
            Configura una nueva ola de medición de clima.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Ej: Clima Q1 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Organización</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona organización" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Instrumento</Label>
            <Select value={instrumentId} onValueChange={setInstrumentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona instrumento" />
              </SelectTrigger>
              <SelectContent>
                {instruments.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name} v{inst.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!name || !orgId || !instrumentId || loading}
          >
            {loading ? "Creando..." : "Crear campaña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

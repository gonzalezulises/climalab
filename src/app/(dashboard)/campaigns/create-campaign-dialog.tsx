"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCampaign } from "@/actions/campaigns";
import { MEASUREMENT_OBJECTIVES } from "@/lib/constants";
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
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import type { Organization, Instrument, Department } from "@/types";

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

  // Basic
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");

  // Dates
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  // Context
  const [objective, setObjective] = useState("");
  const [objectiveDescription, setObjectiveDescription] = useState("");
  const [contextNotes, setContextNotes] = useState("");

  // Targeting
  const [allOrg, setAllOrg] = useState(true);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [targetPopulationOverride, setTargetPopulationOverride] = useState("");

  const selectedOrg = organizations.find((o) => o.id === orgId);
  const orgDepartments: Department[] = useMemo(() => {
    if (!selectedOrg) return [];
    const depts = selectedOrg.departments as unknown;
    if (!Array.isArray(depts)) return [];
    return depts as Department[];
  }, [selectedOrg]);

  const calculatedPopulation = useMemo(() => {
    if (allOrg) return selectedOrg?.employee_count ?? 0;
    return orgDepartments
      .filter((d) => selectedDepts.includes(d.name))
      .reduce((sum, d) => sum + (d.headcount ?? 0), 0);
  }, [allOrg, selectedDepts, orgDepartments, selectedOrg]);

  function toggleDept(deptName: string) {
    setSelectedDepts((prev) =>
      prev.includes(deptName) ? prev.filter((d) => d !== deptName) : [...prev, deptName]
    );
  }

  function resetForm() {
    setName("");
    setOrgId("");
    setInstrumentId("");
    setStartsAt("");
    setEndsAt("");
    setObjective("");
    setObjectiveDescription("");
    setContextNotes("");
    setAllOrg(true);
    setSelectedDepts([]);
    setTargetPopulationOverride("");
  }

  const handleSubmit = async () => {
    if (!name || !orgId || !instrumentId) return;

    setLoading(true);

    const targetPop = targetPopulationOverride
      ? Number(targetPopulationOverride)
      : calculatedPopulation || undefined;

    const result = await createCampaign({
      name,
      organization_id: orgId,
      instrument_id: instrumentId,
      starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
      ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
      measurement_objective: objective ? (objective as "initial_diagnosis") : undefined,
      objective_description:
        objective === "other" && objectiveDescription ? objectiveDescription : undefined,
      context_notes: contextNotes || undefined,
      target_departments: !allOrg && selectedDepts.length > 0 ? selectedDepts : undefined,
      target_population: targetPop,
    });

    if (result.success) {
      toast.success("Campaña creada");
      setOpen(false);
      resetForm();
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear campaña</DialogTitle>
          <DialogDescription>Configura una nueva ola de medición de clima.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Clima Q1 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organización *</Label>
                <Select
                  value={orgId}
                  onValueChange={(v) => {
                    setOrgId(v);
                    setSelectedDepts([]);
                    setAllOrg(true);
                  }}
                >
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
                <Label>Instrumento *</Label>
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
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Ventana temporal</Label>
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

          <Separator />

          {/* Context */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Contexto</Label>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Objetivo de medición</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEASUREMENT_OBJECTIVES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {objective === "other" && (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Describe el objetivo</Label>
                <textarea
                  value={objectiveDescription}
                  onChange={(e) => setObjectiveDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Notas de contexto</Label>
              <textarea
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Ej: Reestructuración reciente, cambio de liderazgo..."
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Targeting */}
          {orgId && orgDepartments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-base font-medium">Alcance</Label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allOrg}
                    onChange={(e) => {
                      setAllOrg(e.target.checked);
                      if (e.target.checked) setSelectedDepts([]);
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">Toda la organización</span>
                </label>

                {!allOrg && (
                  <div className="space-y-2 pl-6">
                    <p className="text-sm text-muted-foreground">
                      Selecciona los departamentos a incluir:
                    </p>
                    <div className="space-y-1">
                      {orgDepartments.map((dept) => (
                        <label
                          key={dept.name}
                          className="flex items-center justify-between gap-2 py-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedDepts.includes(dept.name)}
                              onChange={() => toggleDept(dept.name)}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm">{dept.name}</span>
                          </div>
                          {dept.headcount != null && (
                            <span className="text-sm text-muted-foreground">{dept.headcount}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Población objetivo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={targetPopulationOverride || calculatedPopulation || ""}
                      onChange={(e) => setTargetPopulationOverride(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">personas</span>
                    {targetPopulationOverride && (
                      <button
                        type="button"
                        onClick={() => setTargetPopulationOverride("")}
                        className="text-xs text-muted-foreground underline"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!name || !orgId || !instrumentId || loading}>
            {loading ? "Creando..." : "Crear campaña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

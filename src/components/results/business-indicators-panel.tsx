"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { INDICATOR_TYPES } from "@/lib/constants";
import { createBusinessIndicator, deleteBusinessIndicator } from "@/actions/business-indicators";
import type { BusinessIndicator } from "@/types";

const DEFAULT_UNITS: Record<string, string> = {
  turnover_rate: "%",
  absenteeism_rate: "%",
  customer_nps: "pts",
  customer_satisfaction: "%",
  productivity_index: "",
  incident_count: "",
  custom: "",
};

export function BusinessIndicatorsPanel({
  campaignId,
  indicators: initialIndicators,
}: {
  campaignId: string;
  indicators: BusinessIndicator[];
}) {
  const [indicators, setIndicators] = useState(initialIndicators);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [indicatorType, setIndicatorType] = useState("custom");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setIndicatorType("custom");
    setName("");
    setValue("");
    setUnit("");
    setPeriodStart("");
    setPeriodEnd("");
    setNotes("");
  }

  function handleTypeChange(type: string) {
    setIndicatorType(type);
    if (type !== "custom") {
      setName(INDICATOR_TYPES[type] ?? "");
      setUnit(DEFAULT_UNITS[type] ?? "");
    } else {
      setName("");
      setUnit("");
    }
  }

  async function handleSubmit() {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setLoading(true);
    const result = await createBusinessIndicator({
      campaign_id: campaignId,
      indicator_name: name,
      indicator_value: numValue,
      indicator_unit: unit || null,
      indicator_type: indicatorType as "custom",
      period_start: periodStart || null,
      period_end: periodEnd || null,
      notes: notes || null,
    });

    if (result.success) {
      setIndicators((prev) => [...prev, result.data]);
      resetForm();
      setOpen(false);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const result = await deleteBusinessIndicator(id, campaignId);
    if (result.success) {
      setIndicators((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Indicadores de negocio</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={resetForm}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Agregar indicador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar indicador de negocio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipo de indicador</Label>
                  <Select value={indicatorType} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INDICATOR_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del indicador"
                    disabled={indicatorType !== "custom"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="any"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label>Unidad</Label>
                    <Input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="%"
                      disabled={indicatorType !== "custom"}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Periodo inicio</Label>
                    <Input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Periodo fin</Label>
                    <Input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales (opcional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={loading || !name || !value}>
                  {loading ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {indicators.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay indicadores de negocio registrados para esta campaña.
          </p>
        ) : (
          <div className="space-y-2">
            {indicators.map((ind) => (
              <div key={ind.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{ind.indicator_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {INDICATOR_TYPES[ind.indicator_type] ?? ind.indicator_type}
                      </Badge>
                      {ind.period_start && (
                        <span className="text-xs text-muted-foreground">
                          {ind.period_start} — {ind.period_end ?? ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">
                    {Number(ind.indicator_value)}
                    {ind.indicator_unit && (
                      <span className="text-sm text-muted-foreground ml-0.5">
                        {ind.indicator_unit}
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => handleDelete(ind.id)}
                    aria-label="Eliminar indicador"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { parseDepartmentsWithAI } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp, Loader2, Plus, Sparkles, Upload, X } from "lucide-react";
import type { Department } from "@/types";

const COMMON_DEPARTMENTS = [
  "Administración",
  "Comercial / Ventas",
  "Compras",
  "Contabilidad",
  "Dirección General",
  "Finanzas",
  "Ingeniería",
  "Legal",
  "Logística",
  "Marketing",
  "Operaciones",
  "Producción",
  "Recursos Humanos",
  "Soporte / Atención al Cliente",
  "Tecnología / IT",
];

function parseCSV(text: string): Department[] {
  const results: Department[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  for (const line of lines) {
    const parts = line.split(/[,;]/).map((p) => p.trim());
    const name = parts[0]?.replace(/^["']|["']$/g, "");
    if (!name) continue;

    const headcount = parts[1] ? parseInt(parts[1], 10) : null;
    results.push({
      name,
      headcount: headcount != null && !isNaN(headcount) ? headcount : null,
    });
  }

  return results;
}

function mergeDepartments(existing: Department[], incoming: Department[]): Department[] {
  const merged = [...existing];
  for (const imp of incoming) {
    const found = merged.find((d) => d.name === imp.name);
    if (found) {
      if (imp.headcount != null) found.headcount = imp.headcount;
    } else {
      merged.push(imp);
    }
  }
  return merged;
}

export function DepartmentEditor({
  departments,
  onChange,
  employeeCount,
}: {
  departments: Department[];
  onChange: (departments: Department[]) => void;
  employeeCount?: number;
}) {
  const [customName, setCustomName] = useState("");
  const [customHeadcount, setCustomHeadcount] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalHeadcount = departments.reduce((sum, d) => sum + (d.headcount ?? 0), 0);
  const headcountMismatch =
    employeeCount != null &&
    departments.length > 0 &&
    totalHeadcount > 0 &&
    totalHeadcount !== employeeCount;

  const activeNames = new Set(departments.map((d) => d.name));

  function togglePreset(name: string) {
    if (activeNames.has(name)) {
      onChange(departments.filter((d) => d.name !== name));
    } else {
      onChange([...departments, { name, headcount: null }]);
    }
  }

  function addCustom() {
    const trimmed = customName.trim();
    if (!trimmed || activeNames.has(trimmed)) return;
    onChange([
      ...departments,
      {
        name: trimmed,
        headcount: customHeadcount ? Number(customHeadcount) : null,
      },
    ]);
    setCustomName("");
    setCustomHeadcount("");
  }

  function remove(name: string) {
    onChange(departments.filter((d) => d.name !== name));
  }

  function updateHeadcount(name: string, value: string) {
    onChange(
      departments.map((d) =>
        d.name === name ? { ...d, headcount: value ? Number(value) : null } : d
      )
    );
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Put file content into textarea for review / AI parsing
      setImportText(text);
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleManualParse() {
    const imported = parseCSV(importText);
    if (imported.length === 0) {
      toast.error("No se encontraron departamentos en el texto");
      return;
    }
    onChange(mergeDepartments(departments, imported));
    setImportText("");
    setShowImport(false);
    toast.success(`${imported.length} departamentos importados`);
  }

  async function handleAIParse() {
    if (!importText.trim()) return;
    setAiParsing(true);

    const result = await parseDepartmentsWithAI(importText);

    if (result.success) {
      if (result.data.length === 0) {
        toast.error("No se encontraron departamentos en el texto");
      } else {
        onChange(mergeDepartments(departments, result.data));
        setImportText("");
        setShowImport(false);
        toast.success(`${result.data.length} departamentos importados con IA`);
      }
    } else {
      toast.error(result.error);
    }
    setAiParsing(false);
  }

  return (
    <div className="space-y-4">
      {/* Preset grid */}
      <div>
        <p className="text-sm font-medium mb-2">Departamentos comunes</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_DEPARTMENTS.map((name) => {
            const active = activeNames.has(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => togglePreset(name)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-foreground border-input hover:bg-muted"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom add */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Otro departamento..."
          />
        </div>
        <div className="w-28">
          <Input
            type="number"
            min={0}
            value={customHeadcount}
            onChange={(e) => setCustomHeadcount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Personas"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addCustom}
          aria-label="Agregar departamento"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Import section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowImport(!showImport)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importar datos
            {showImport ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            className="hidden"
            onChange={handleCSVUpload}
          />
        </div>

        {showImport && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Pega o sube tus datos de departamentos</p>
              <button
                type="button"
                onClick={() => setShowExample(!showExample)}
                className="text-xs text-muted-foreground underline"
              >
                {showExample ? "Ocultar ejemplo" : "Ver ejemplo"}
              </button>
            </div>

            {showExample && (
              <div className="rounded border bg-muted/50 p-3 text-xs font-mono space-y-1">
                <p className="text-muted-foreground mb-2 font-sans text-xs">
                  Formato CSV (coma o punto y coma):
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8">Departamento</TableHead>
                      <TableHead className="text-xs h-8 text-right">Personas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="py-1">Ingeniería</TableCell>
                      <TableCell className="py-1 text-right">45</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-1">Marketing</TableCell>
                      <TableCell className="py-1 text-right">20</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-1">Recursos Humanos</TableCell>
                      <TableCell className="py-1 text-right">15</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-muted-foreground mt-2 font-sans">Texto equivalente:</p>
                <pre className="mt-1">
                  {`Ingeniería, 45
Marketing, 20
Recursos Humanos, 15`}
                </pre>
                <p className="text-muted-foreground mt-2 font-sans">
                  Con la IA puedes pegar cualquier formato: tablas de Excel, listas, texto libre,
                  etc.
                </p>
              </div>
            )}

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={5}
              placeholder={
                "Ingeniería, 45\nMarketing, 20\nRecursos Humanos, 15\n\nO pega cualquier texto y usa la IA para extraer los datos..."
              }
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-mono"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Subir CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualParse}
                disabled={!importText.trim()}
              >
                Parsear CSV
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAIParse}
                disabled={!importText.trim() || aiParsing}
              >
                {aiParsing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {aiParsing ? "Procesando..." : "Parsear con IA"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Department table */}
      {departments.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Departamento</TableHead>
              <TableHead className="w-28 text-right">Personas</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.name}>
                <TableCell>{dept.name}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    value={dept.headcount ?? ""}
                    onChange={(e) => updateHeadcount(dept.name, e.target.value)}
                    className="h-8 w-20 text-right ml-auto"
                  />
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => remove(dept.name)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Total</TableCell>
              <TableCell className="text-right font-medium">{totalHeadcount}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Selecciona departamentos o agrega uno personalizado.
        </p>
      )}

      {headcountMismatch && (
        <p className="text-sm text-amber-600">
          La suma de personas ({totalHeadcount}) no coincide con el total de empleados (
          {employeeCount}).
        </p>
      )}
    </div>
  );
}

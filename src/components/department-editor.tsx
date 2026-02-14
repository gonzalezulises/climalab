"use client";

import { useRef, useState } from "react";
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
import { Plus, Upload, X } from "lucide-react";
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
    // Support comma or semicolon separator
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalHeadcount = departments.reduce(
    (sum, d) => sum + (d.headcount ?? 0),
    0
  );
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
        d.name === name
          ? { ...d, headcount: value ? Number(value) : null }
          : d
      )
    );
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const imported = parseCSV(text);
      if (imported.length === 0) return;

      // Merge: update existing headcounts, add new ones
      const merged = [...departments];
      for (const imp of imported) {
        const existing = merged.find((d) => d.name === imp.name);
        if (existing) {
          if (imp.headcount != null) existing.headcount = imp.headcount;
        } else {
          merged.push(imp);
        }
      }
      onChange(merged);
    };
    reader.readAsText(file);

    // Reset so the same file can be re-uploaded
    e.target.value = "";
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

      {/* Custom add + CSV import */}
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
        <Button type="button" variant="outline" size="icon" onClick={addCustom}>
          <Plus className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleCSVUpload}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          title="Importar CSV (departamento, personas)"
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        CSV: una fila por departamento. Columnas: nombre, personas (opcional).
        Separador: coma o punto y coma.
      </p>

      {/* Table */}
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
              <TableCell className="text-right font-medium">
                {totalHeadcount}
              </TableCell>
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
          La suma de personas ({totalHeadcount}) no coincide con el total de
          empleados ({employeeCount}).
        </p>
      )}
    </div>
  );
}

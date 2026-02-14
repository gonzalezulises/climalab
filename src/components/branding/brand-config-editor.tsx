"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DEFAULT_BRAND_CONFIG } from "@/lib/constants";
import type { BrandConfig } from "@/types";

type PartialBrand = Partial<BrandConfig>;

export function BrandConfigEditor({
  config,
  onChange,
  logoUrl,
  orgName,
}: {
  config: PartialBrand;
  onChange: (config: PartialBrand) => void;
  logoUrl: string | null;
  orgName: string;
}) {
  const brand = { ...DEFAULT_BRAND_CONFIG, ...config };

  function update(key: keyof BrandConfig, value: string | boolean | null) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls */}
      <div className="space-y-5">
        {/* Colors */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Colores</p>
          <div className="grid grid-cols-3 gap-3">
            <ColorPicker
              label="Principal"
              value={brand.primary_color}
              onChange={(v) => update("primary_color", v)}
            />
            <ColorPicker
              label="Secundario"
              value={brand.secondary_color}
              onChange={(v) => update("secondary_color", v)}
            />
            <ColorPicker
              label="Acento (CTA)"
              value={brand.accent_color}
              onChange={(v) => update("accent_color", v)}
            />
          </div>
        </div>

        {/* Show powered by */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show_powered_by"
            checked={brand.show_powered_by}
            onChange={(e) => update("show_powered_by", e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="show_powered_by" className="text-sm font-normal cursor-pointer">
            Mostrar &ldquo;Powered by ClimaLab&rdquo;
          </Label>
        </div>

        {/* Custom texts */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Texto de bienvenida personalizado</Label>
            <textarea
              value={brand.custom_welcome_text ?? ""}
              onChange={(e) => update("custom_welcome_text", e.target.value || null)}
              placeholder="Tu opinión es importante para construir un mejor lugar de trabajo..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
              maxLength={500}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Texto de agradecimiento personalizado</Label>
            <textarea
              value={brand.custom_thankyou_text ?? ""}
              onChange={(e) => update("custom_thankyou_text", e.target.value || null)}
              placeholder="Tus respuestas han sido registradas de forma anónima..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
              maxLength={500}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Pie de email personalizado</Label>
            <Input
              value={brand.custom_email_footer ?? ""}
              onChange={(e) => update("custom_email_footer", e.target.value || null)}
              placeholder="Enviado por Nombre de la Empresa"
              maxLength={200}
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Vista previa</p>
        <div
          className="rounded-lg border overflow-hidden text-sm"
          style={{ background: "#f4f4f5" }}
        >
          {/* Header */}
          <div className="px-4 py-5 text-center" style={{ background: brand.primary_color }}>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-8 mx-auto mb-2 object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            )}
            <p className="font-semibold text-white text-base">
              {logoUrl ? "" : orgName || "Mi Organización"}
            </p>
            <p className="text-white/70 text-xs mt-0.5">Encuesta de Clima Organizacional</p>
          </div>
          {/* Body */}
          <div className="bg-white mx-3 my-3 rounded p-4 space-y-3">
            <p className="text-xs text-gray-600">
              {brand.custom_welcome_text ||
                "Tu opinión es importante para construir un mejor lugar de trabajo."}
            </p>
            <div className="flex justify-center">
              <div
                className="px-4 py-1.5 rounded text-white text-xs font-medium"
                style={{ background: brand.accent_color }}
              >
                Responder encuesta
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="text-center py-2 text-[10px] text-gray-400">
            {brand.custom_email_footer ||
              (brand.show_powered_by ? "Enviado por ClimaLab" : orgName)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-0 p-0"
        />
        <Input
          value={value}
          onChange={(e) => {
            if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          className="h-8 text-xs font-mono"
          maxLength={7}
        />
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GENDER_OPTIONS,
  LIKERT_LABELS,
  TENURE_OPTIONS,
  type SurveyDimension,
} from "@/app/survey/[token]/survey-types";

type BrandLike = {
  primary_color?: string;
  accent_color?: string;
  custom_welcome_text?: string | null;
  custom_thankyou_text?: string | null;
  show_powered_by?: boolean;
};

export function SurveyProgressBar({
  progressPct,
  primaryColor,
}: {
  progressPct: number;
  primaryColor: string;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="h-1 bg-gray-200">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progressPct}%`, backgroundColor: primaryColor }}
        />
      </div>
      <div className="text-xs text-gray-500 text-center py-1">{progressPct}% completado</div>
    </div>
  );
}

export function WelcomeStep({
  logoUrl,
  organizationName,
  brand,
  onStart,
}: {
  logoUrl: string | null;
  organizationName: string;
  brand: BrandLike;
  onStart: () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
      {logoUrl && (
        <Image
          src={logoUrl}
          alt={organizationName}
          width={240}
          height={64}
          unoptimized
          className="h-16 w-auto object-contain"
        />
      )}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Encuesta de Clima Organizacional</h1>
        {organizationName && <p className="text-lg text-gray-600">{organizationName}</p>}
      </div>
      <p className="text-gray-600 max-w-md">
        {brand.custom_welcome_text ||
          "Tu opinión es importante para construir un mejor lugar de trabajo. Esta encuesta es completamente anónima y tomará aproximadamente 8-10 minutos."}
      </p>
      <Button size="lg" onClick={onStart} style={{ backgroundColor: brand.accent_color }}>
        Comenzar
      </Button>
      {brand.show_powered_by && <p className="text-xs text-gray-400">Powered by ClimaLab</p>}
    </div>
  );
}

export function DemographicsStep(props: {
  departments: string[];
  department: string;
  tenure: string;
  gender: string;
  saving: boolean;
  preAssignedDepartment: boolean;
  onDepartmentChange: (value: string) => void;
  onTenureChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onNext: () => void | Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos demográficos</CardTitle>
        <p className="text-sm text-gray-500">
          Esta información se usa únicamente para análisis agregado y no permite identificarte.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {props.preAssignedDepartment ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Departamento</label>
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
              {props.department}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Departamento <span className="text-red-500">*</span>
            </label>
            <Select value={props.department} onValueChange={props.onDepartmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu departamento" />
              </SelectTrigger>
              <SelectContent>
                {props.departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Antigüedad <span className="text-red-500">*</span>
          </label>
          <Select value={props.tenure} onValueChange={props.onTenureChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu antigüedad" />
            </SelectTrigger>
            <SelectContent>
              {TENURE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Género <span className="text-gray-400 text-xs">(opcional)</span>
          </label>
          <Select value={props.gender} onValueChange={props.onGenderChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu género" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          onClick={props.onNext}
          disabled={!props.department || !props.tenure || props.saving}
        >
          {props.saving ? "Guardando..." : "Continuar"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function DimensionStep(props: {
  dimensionIndex: number;
  totalDimensions: number;
  dimension: SurveyDimension;
  scores: Record<string, number>;
  primaryColor: string;
  saving: boolean;
  saveError: string | null;
  onScoreChange: (itemId: string, score: number) => void;
  onBack: () => void;
  onNext: () => void | Promise<void>;
  canContinue: boolean;
  allowComments: boolean;
}) {
  const isLastStep = props.dimensionIndex === props.totalDimensions - 1;

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        Sección {props.dimensionIndex + 1} de {props.totalDimensions}
      </div>

      {props.dimension.items.map((item, itemIndex) => (
        <Card key={item.id}>
          <CardContent className="pt-6">
            <p className="text-base font-medium mb-4">
              {itemIndex + 1}. {item.text}
            </p>
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {LIKERT_LABELS.map((likert) => {
                const isSelected = props.scores[item.id] === likert.value;
                return (
                  <button
                    key={likert.value}
                    onClick={() => props.onScoreChange(item.id, likert.value)}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 p-2 sm:p-3 transition-colors text-xs sm:text-sm ${
                      isSelected
                        ? "font-medium"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: props.primaryColor,
                            backgroundColor: `${props.primaryColor}10`,
                            color: props.primaryColor,
                          }
                        : undefined
                    }
                  >
                    <span className="text-lg font-bold mb-1">{likert.value}</span>
                    <span className="text-[10px] sm:text-xs leading-tight text-center">
                      {likert.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {props.saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {props.saveError} — Intenta de nuevo.
        </div>
      )}

      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={props.onBack}>
          Atrás
        </Button>
        <Button onClick={props.onNext} disabled={!props.canContinue || props.saving}>
          {props.saving
            ? "Guardando..."
            : isLastStep
              ? props.allowComments
                ? "Siguiente"
                : "Finalizar"
              : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}

export function OpenQuestionsStep(props: {
  primaryColor: string;
  saving: boolean;
  totalDimensions: number;
  enpsScore: number | null;
  openStrength: string;
  openImprovement: string;
  openGeneral: string;
  onEnpsChange: (value: number) => void;
  onOpenStrengthChange: (value: string) => void;
  onOpenImprovementChange: (value: string) => void;
  onOpenGeneralChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>eNPS</CardTitle>
          <p className="text-sm text-gray-500">
            ¿Qué tan probable es que recomiendes esta organización como un buen lugar para trabajar?
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 11 }, (_, index) => index).map((value) => (
              <button
                key={value}
                onClick={() => props.onEnpsChange(value)}
                className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-colors ${
                  props.enpsScore === value
                    ? "font-medium"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
                style={
                  props.enpsScore === value
                    ? {
                        borderColor: props.primaryColor,
                        backgroundColor: `${props.primaryColor}10`,
                        color: props.primaryColor,
                      }
                    : undefined
                }
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
            <span>Nada probable</span>
            <span>Muy probable</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comentarios abiertos</CardTitle>
          <p className="text-sm text-gray-500">
            Tus respuestas son anónimas. Estas preguntas son opcionales.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <SurveyTextarea
            label="¿Qué es lo mejor de trabajar aquí?"
            value={props.openStrength}
            onChange={props.onOpenStrengthChange}
          />
          <SurveyTextarea
            label="Si pudieras cambiar una cosa de esta organización, ¿cuál sería?"
            value={props.openImprovement}
            onChange={props.onOpenImprovementChange}
          />
          <SurveyTextarea
            label="¿Hay algo más que quieras compartir?"
            hint="(opcional)"
            value={props.openGeneral}
            onChange={props.onOpenGeneralChange}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={props.onBack}>
          Atrás
        </Button>
        <Button onClick={props.onNext} disabled={props.saving}>
          {props.saving ? "Guardando..." : "Finalizar encuesta"}
        </Button>
      </div>
    </div>
  );
}

export function ThanksStep({ brand }: { brand: BrandLike }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900">¡Gracias por tu participación!</h1>
      <p className="text-gray-600 max-w-md">
        {brand.custom_thankyou_text ||
          "Tus respuestas han sido registradas de forma anónima. Tu opinión contribuye a mejorar el ambiente de trabajo."}
      </p>
      {brand.show_powered_by && <p className="text-xs text-gray-400">Powered by ClimaLab</p>}
    </div>
  );
}

function SurveyTextarea(props: {
  label: string;
  value: string;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {props.label}{" "}
        {props.hint ? <span className="text-gray-400 text-xs">{props.hint}</span> : null}
      </label>
      <textarea
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="w-full min-h-[80px] rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        placeholder="Escribe tu respuesta..."
        maxLength={2000}
      />
    </div>
  );
}

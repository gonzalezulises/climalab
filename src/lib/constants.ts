export const ROLES = {
  super_admin: "Super Admin",
  org_admin: "Admin de Organización",
  member: "Miembro",
} as const;

export const SIZE_CATEGORIES = {
  micro: "Micro (1-10)",
  small: "Pequeña (11-50)",
  medium: "Mediana (51-200)",
  large: "Grande (201-500)",
} as const;

export const COUNTRIES = [
  { code: "MX", name: "México" },
  { code: "CO", name: "Colombia" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
  { code: "EC", name: "Ecuador" },
  { code: "PA", name: "Panamá" },
  { code: "CR", name: "Costa Rica" },
  { code: "GT", name: "Guatemala" },
  { code: "SV", name: "El Salvador" },
  { code: "HN", name: "Honduras" },
  { code: "NI", name: "Nicaragua" },
  { code: "DO", name: "República Dominicana" },
  { code: "US", name: "Estados Unidos" },
  { code: "ES", name: "España" },
] as const;

export const INSTRUMENT_MODES = {
  full: "Completo",
  pulse: "Pulso",
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
  bienestar: "Bienestar",
  direccion: "Dirección y Supervisión",
  compensacion: "Compensación",
  cultura: "Cultura",
  engagement: "Engagement",
};

export const INDICATOR_TYPES: Record<string, string> = {
  turnover_rate: "Tasa de rotación (%)",
  absenteeism_rate: "Tasa de ausentismo (%)",
  customer_nps: "NPS de clientes",
  customer_satisfaction: "Satisfacción de clientes",
  productivity_index: "Índice de productividad",
  incident_count: "Conteo de incidentes",
  custom: "Otro indicador",
};

export const ANALYSIS_LEVELS: Record<
  string,
  { label: string; description: string; categories: string[] }
> = {
  individual: {
    label: "Sistema Individual",
    description:
      "Cómo percibe el colaborador su experiencia personal de trabajo",
    categories: ["bienestar"],
  },
  interpersonal: {
    label: "Sistema Interpersonal",
    description:
      "Cómo percibe la relación con supervisores, pares y la dirección",
    categories: ["direccion"],
  },
  organizacional: {
    label: "Sistema Organizacional",
    description:
      "Cómo percibe las prácticas, políticas y cultura de la organización",
    categories: ["compensacion", "cultura"],
  },
};

export const MEASUREMENT_OBJECTIVES = {
  initial_diagnosis: "Diagnóstico inicial",
  periodic_followup: "Seguimiento periódico",
  post_intervention: "Post-intervención",
  specific_assessment: "Evaluación específica",
  other: "Otro",
} as const;

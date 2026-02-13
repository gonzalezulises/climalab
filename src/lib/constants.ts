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

/**
 * Instrument UUIDs, climate presets, and demographic distributions.
 */

// Instrument UUIDs
export const CORE_INSTRUMENT_ID = "b0000000-0000-0000-0000-000000000001";
export const PULSE_INSTRUMENT_ID = "b0000000-0000-0000-0000-000000000002";
export const MODULE_IDS: Record<string, string> = {
  CAM: "b0000000-0000-0000-0000-000000000003",
  CLI: "b0000000-0000-0000-0000-000000000004",
  DIG: "b0000000-0000-0000-0000-000000000005",
};

// 22 dimension codes (Core v4.0)
export const DIMENSION_CODES = [
  "ORG",
  "PRO",
  "SEG",
  "BAL",
  "CUI",
  "DEM",
  "LID",
  "AUT",
  "COM",
  "CON",
  "ROL",
  "CMP",
  "REC",
  "BEN",
  "EQA",
  "NDI",
  "COH",
  "INN",
  "RES",
  "DES",
  "APR",
  "ENG",
] as const;

// Climate presets — target average per dimension
export const CLIMATE_PRESETS: Record<string, Record<string, number>> = {
  excellent: {
    ORG: 4.6,
    PRO: 4.5,
    SEG: 4.4,
    BAL: 4.3,
    CUI: 4.5,
    DEM: 4.2,
    LID: 4.5,
    AUT: 4.4,
    COM: 4.3,
    CON: 4.4,
    ROL: 4.5,
    CMP: 4.2,
    REC: 4.3,
    BEN: 4.1,
    EQA: 4.2,
    NDI: 4.6,
    COH: 4.5,
    INN: 4.3,
    RES: 4.4,
    DES: 4.2,
    APR: 4.3,
    ENG: 4.5,
    // Module defaults
    CAM: 4.3,
    CLI: 4.4,
    DIG: 4.2,
  },
  good: {
    ORG: 4.3,
    PRO: 4.25,
    SEG: 3.9,
    BAL: 3.85,
    CUI: 4.0,
    DEM: 3.7,
    LID: 4.2,
    AUT: 4.1,
    COM: 3.95,
    CON: 3.9,
    ROL: 4.0,
    CMP: 3.6,
    REC: 3.8,
    BEN: 3.65,
    EQA: 3.7,
    NDI: 4.4,
    COH: 4.15,
    INN: 4.0,
    RES: 4.05,
    DES: 3.7,
    APR: 3.9,
    ENG: 4.1,
    CAM: 3.9,
    CLI: 4.0,
    DIG: 3.85,
  },
  mixed: {
    ORG: 4.0,
    PRO: 3.9,
    SEG: 3.6,
    BAL: 3.5,
    CUI: 3.7,
    DEM: 3.3,
    LID: 3.8,
    AUT: 3.7,
    COM: 3.5,
    CON: 3.5,
    ROL: 3.7,
    CMP: 3.2,
    REC: 3.4,
    BEN: 3.2,
    EQA: 3.3,
    NDI: 4.0,
    COH: 3.8,
    INN: 3.5,
    RES: 3.7,
    DES: 3.3,
    APR: 3.5,
    ENG: 3.8,
    CAM: 3.5,
    CLI: 3.6,
    DIG: 3.4,
  },
  poor: {
    ORG: 3.2,
    PRO: 3.0,
    SEG: 2.8,
    BAL: 2.7,
    CUI: 2.9,
    DEM: 2.5,
    LID: 2.9,
    AUT: 2.8,
    COM: 2.6,
    CON: 2.6,
    ROL: 2.8,
    CMP: 2.4,
    REC: 2.5,
    BEN: 2.3,
    EQA: 2.4,
    NDI: 3.2,
    COH: 3.0,
    INN: 2.7,
    RES: 2.9,
    DES: 2.5,
    APR: 2.7,
    ENG: 2.9,
    CAM: 2.7,
    CLI: 2.8,
    DIG: 2.6,
  },
};

// Department pool
export const DEPARTMENT_POOL = [
  "Ingenieria",
  "Marketing",
  "Operaciones",
  "RRHH",
  "Finanzas",
  "Ventas",
  "Soporte",
  "Legal",
  "Logistica",
  "Tecnologia",
];

// Tenure distribution
export const TENURES = ["<1", "1-3", "3-5", "5-10", "10+"] as const;
export const TENURE_WEIGHTS = [0.15, 0.25, 0.25, 0.2, 0.15];

// Gender distribution
export const GENDERS = ["Femenino", "Masculino", "No binario", "Prefiero no decir"] as const;
export const GENDER_WEIGHTS = [0.44, 0.48, 0.04, 0.04];

// LATAM countries
export const LATAM_COUNTRIES = ["PA", "MX", "CO", "CL", "PE"];

// Industries
export const INDUSTRIES = [
  "Tecnología",
  "Servicios financieros",
  "Manufactura",
  "Retail",
  "Salud",
  "Educación",
  "Consultoría",
  "Logística",
];

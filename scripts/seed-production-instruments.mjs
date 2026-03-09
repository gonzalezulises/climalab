#!/usr/bin/env node
/**
 * Seed Production Instruments
 *
 * Replaces old v3 instrument data (6 dimensions) with full v4.0 instrument:
 * - 22 Core dimensions + 111 items (109 regular + 2 attention checks)
 * - 22 Pulso dimensions + 22 anchor items
 * - 3 Module dimensions + 16 items (already exist but re-inserted for safety)
 *
 * Also cleans up any campaign data that references old dimensions.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fgqufarqxvqytwbuleqp.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Instrument IDs
// ============================================================
const CORE_ID = "b0000000-0000-0000-0000-000000000001";
const PULSO_ID = "b0000000-0000-0000-0000-000000000002";
const CAM_ID = "b0000000-0000-0000-0000-000000000003";
const CLI_ID = "b0000000-0000-0000-0000-000000000004";
const DIG_ID = "b0000000-0000-0000-0000-000000000005";

// ============================================================
// Core Dimensions v4.0 (22)
// ============================================================
const CORE_DIMENSIONS = [
  // BIENESTAR (6)
  { id: "d3000000-0000-0000-0000-000000000001", instrument_id: CORE_ID, name: "Orgullo Institucional", code: "ORG", description: "Identificación con la organización, orgullo de pertenencia y alineación de valores.", sort_order: 1, category: "bienestar", theoretical_basis: "Mael & Ashforth 1992, Psychological Ownership (Pierce 2001)" },
  { id: "d3000000-0000-0000-0000-000000000002", instrument_id: CORE_ID, name: "Propósito del Trabajo", code: "PRO", description: "Sentido de significado, contribución visible y motivación intrínseca.", sort_order: 2, category: "bienestar", theoretical_basis: "Meaning of Work (Steger 2012), UWES-9 dedicación" },
  { id: "d3000000-0000-0000-0000-000000000003", instrument_id: CORE_ID, name: "Seguridad Física y Psicológica", code: "SEG", description: "Seguridad laboral, bienestar organizacional y libertad para expresar preocupaciones.", sort_order: 3, category: "bienestar", theoretical_basis: "JD-R Model (Bakker & Demerouti 2007), COPSOQ" },
  { id: "d3000000-0000-0000-0000-000000000004", instrument_id: CORE_ID, name: "Balance Vida-Trabajo", code: "BAL", description: "Equilibrio entre responsabilidades laborales y personales, respeto al tiempo fuera del trabajo.", sort_order: 4, category: "bienestar", theoretical_basis: "Work-Life Balance (Greenhaus 2003), JD-R recursos" },
  { id: "d3000000-0000-0000-0000-000000000005", instrument_id: CORE_ID, name: "Cuidado Mutuo", code: "CUI", description: "Apoyo entre compañeros, recursos organizacionales para bienestar y soporte social.", sort_order: 5, category: "bienestar", theoretical_basis: "Perceived Organizational Support (Eisenberger 1986)" },
  { id: "d3000000-0000-0000-0000-000000000020", instrument_id: CORE_ID, name: "Demandas Laborales", code: "DEM", description: "Carga de trabajo, presión de plazos y adecuación de procesos y recursos.", sort_order: 20, category: "bienestar", theoretical_basis: "JD-R Model (Bakker & Demerouti 2007), Job Demands" },

  // DIRECCIÓN (5)
  { id: "d3000000-0000-0000-0000-000000000006", instrument_id: CORE_ID, name: "Liderazgo Efectivo", code: "LID", description: "Calidad de la relación supervisor-subordinado: retroalimentación, accesibilidad, integridad y apoyo.", sort_order: 6, category: "direccion", theoretical_basis: "LMX-7 (Graen & Uhl-Bien 1995), Servant Leadership (Liden 2008)" },
  { id: "d3000000-0000-0000-0000-000000000007", instrument_id: CORE_ID, name: "Autonomía", code: "AUT", description: "Libertad para organizar el trabajo, tomar decisiones y actuar con criterio propio.", sort_order: 7, category: "direccion", theoretical_basis: "Self-Determination Theory (Deci & Ryan 2000), JD-R" },
  { id: "d3000000-0000-0000-0000-000000000008", instrument_id: CORE_ID, name: "Comunicación Interna", code: "COM", description: "Información oportuna, canales bidireccionales, participación en decisiones y transparencia.", sort_order: 8, category: "direccion", theoretical_basis: "Roberts & O'Reilly 1974, Voice Behavior (LePine & Van Dyne 1998)" },
  { id: "d3000000-0000-0000-0000-000000000009", instrument_id: CORE_ID, name: "Confianza Institucional", code: "CON", description: "Confianza en la dirección, coherencia entre discurso y acción, transparencia estratégica.", sort_order: 9, category: "direccion", theoretical_basis: "Organizational Trust (Mayer 1995)" },
  { id: "d3000000-0000-0000-0000-000000000019", instrument_id: CORE_ID, name: "Claridad de Rol", code: "ROL", description: "Claridad sobre responsabilidades, expectativas y contribución estratégica del puesto.", sort_order: 19, category: "direccion", theoretical_basis: "Role Clarity (Rizzo 1970), Role Ambiguity & Conflict" },

  // COMPENSACIÓN (5)
  { id: "d3000000-0000-0000-0000-000000000010", instrument_id: CORE_ID, name: "Compensación", code: "CMP", description: "Justicia salarial, competitividad en el mercado y transparencia en la remuneración.", sort_order: 10, category: "compensacion", theoretical_basis: "Equity Theory (Adams 1963), Organizational Justice (Colquitt 2001)" },
  { id: "d3000000-0000-0000-0000-000000000011", instrument_id: CORE_ID, name: "Reconocimiento", code: "REC", description: "Valoración del trabajo, celebración de logros y reconocimiento oportuno.", sort_order: 11, category: "compensacion", theoretical_basis: "Perceived Organizational Support, Recognition practices" },
  { id: "d3000000-0000-0000-0000-000000000012", instrument_id: CORE_ID, name: "Beneficios", code: "BEN", description: "Adecuación de beneficios a necesidades, inversión en calidad de vida.", sort_order: 12, category: "compensacion", theoretical_basis: "Total Rewards (WorldatWork), Perceived investment in employee development" },
  { id: "d3000000-0000-0000-0000-000000000013", instrument_id: CORE_ID, name: "Equidad en Ascensos", code: "EQA", description: "Transparencia en promociones, justicia procedimental y distributiva en oportunidades.", sort_order: 13, category: "compensacion", theoretical_basis: "Procedural Justice (Colquitt 2001), Promotional Justice" },
  { id: "d3000000-0000-0000-0000-000000000022", instrument_id: CORE_ID, name: "No Discriminación", code: "NDI", description: "Trato equitativo independientemente de características personales: edad, raza, género, orientación sexual y condición socioeconómica.", sort_order: 22, category: "compensacion", theoretical_basis: "Interactional Justice (Colquitt 2001), Equal Employment Opportunity" },

  // CULTURA (5)
  { id: "d3000000-0000-0000-0000-000000000014", instrument_id: CORE_ID, name: "Cohesión de Equipo", code: "COH", description: "Colaboración, compañerismo, resolución constructiva de conflictos.", sort_order: 14, category: "cultura", theoretical_basis: "Team Cohesion (Carron 1985), Social Capital" },
  { id: "d3000000-0000-0000-0000-000000000015", instrument_id: CORE_ID, name: "Innovación y Cambio", code: "INN", description: "Fomento de innovación, seguridad psicológica para proponer ideas, adaptación al cambio.", sort_order: 15, category: "cultura", theoretical_basis: "Psychological Safety (Edmondson 1999), Change Readiness (Armenakis 1993)" },
  { id: "d3000000-0000-0000-0000-000000000016", instrument_id: CORE_ID, name: "Resultados y Logros", code: "RES", description: "Claridad de objetivos, disponibilidad de recursos, reconocimiento de logros.", sort_order: 16, category: "cultura", theoretical_basis: "Goal Setting Theory (Locke & Latham 1990), Achievement motivation" },
  { id: "d3000000-0000-0000-0000-000000000017", instrument_id: CORE_ID, name: "Desarrollo Profesional", code: "DES", description: "Oportunidades de crecimiento, plan de carrera, capacitación relevante.", sort_order: 17, category: "cultura", theoretical_basis: "Career Growth Opportunity (Kraimer 2011), Role Clarity (Rizzo 1970)" },
  { id: "d3000000-0000-0000-0000-000000000021", instrument_id: CORE_ID, name: "Aprendizaje Organizacional", code: "APR", description: "Aprendizaje de errores, compartir conocimiento, mejora continua de procesos.", sort_order: 21, category: "cultura", theoretical_basis: "Organizational Learning (Senge 1990), Learning Organization (Garvin 1993)" },

  // ENGAGEMENT (transversal)
  { id: "d3000000-0000-0000-0000-000000000018", instrument_id: CORE_ID, name: "Engagement y Compromiso", code: "ENG", description: "Vigor, dedicación, absorción e intención de permanencia. Variable dependiente para engagement drivers.", sort_order: 18, category: "engagement", theoretical_basis: "UWES-9 (Schaufeli 2006), Organizational Commitment (Allen & Meyer 1990)" },
];

// ============================================================
// Pulso Dimensions v4.0 (22)
// ============================================================
const PULSO_DIMENSIONS = [
  { id: "d4000000-0000-0000-0000-000000000001", instrument_id: PULSO_ID, name: "Orgullo Institucional", code: "ORG", description: "Pulso: Orgullo Institucional", sort_order: 1, category: "bienestar", theoretical_basis: "Mael & Ashforth 1992" },
  { id: "d4000000-0000-0000-0000-000000000002", instrument_id: PULSO_ID, name: "Propósito del Trabajo", code: "PRO", description: "Pulso: Propósito del Trabajo", sort_order: 2, category: "bienestar", theoretical_basis: "Meaning of Work (Steger 2012)" },
  { id: "d4000000-0000-0000-0000-000000000003", instrument_id: PULSO_ID, name: "Seguridad Física y Psicológica", code: "SEG", description: "Pulso: Seguridad", sort_order: 3, category: "bienestar", theoretical_basis: "JD-R Model" },
  { id: "d4000000-0000-0000-0000-000000000004", instrument_id: PULSO_ID, name: "Balance Vida-Trabajo", code: "BAL", description: "Pulso: Balance", sort_order: 4, category: "bienestar", theoretical_basis: "Greenhaus 2003" },
  { id: "d4000000-0000-0000-0000-000000000005", instrument_id: PULSO_ID, name: "Cuidado Mutuo", code: "CUI", description: "Pulso: Cuidado Mutuo", sort_order: 5, category: "bienestar", theoretical_basis: "Eisenberger 1986" },
  { id: "d4000000-0000-0000-0000-000000000006", instrument_id: PULSO_ID, name: "Liderazgo Efectivo", code: "LID", description: "Pulso: Liderazgo", sort_order: 6, category: "direccion", theoretical_basis: "LMX-7" },
  { id: "d4000000-0000-0000-0000-000000000007", instrument_id: PULSO_ID, name: "Autonomía", code: "AUT", description: "Pulso: Autonomía", sort_order: 7, category: "direccion", theoretical_basis: "Deci & Ryan 2000" },
  { id: "d4000000-0000-0000-0000-000000000008", instrument_id: PULSO_ID, name: "Comunicación Interna", code: "COM", description: "Pulso: Comunicación", sort_order: 8, category: "direccion", theoretical_basis: "Roberts & O'Reilly 1974" },
  { id: "d4000000-0000-0000-0000-000000000009", instrument_id: PULSO_ID, name: "Confianza Institucional", code: "CON", description: "Pulso: Confianza", sort_order: 9, category: "direccion", theoretical_basis: "Mayer 1995" },
  { id: "d4000000-0000-0000-0000-000000000010", instrument_id: PULSO_ID, name: "Compensación", code: "CMP", description: "Pulso: Compensación", sort_order: 10, category: "compensacion", theoretical_basis: "Adams 1963" },
  { id: "d4000000-0000-0000-0000-000000000011", instrument_id: PULSO_ID, name: "Reconocimiento", code: "REC", description: "Pulso: Reconocimiento", sort_order: 11, category: "compensacion", theoretical_basis: "POS" },
  { id: "d4000000-0000-0000-0000-000000000012", instrument_id: PULSO_ID, name: "Beneficios", code: "BEN", description: "Pulso: Beneficios", sort_order: 12, category: "compensacion", theoretical_basis: "WorldatWork" },
  { id: "d4000000-0000-0000-0000-000000000013", instrument_id: PULSO_ID, name: "Equidad en Ascensos", code: "EQA", description: "Pulso: Equidad", sort_order: 13, category: "compensacion", theoretical_basis: "Colquitt 2001" },
  { id: "d4000000-0000-0000-0000-000000000022", instrument_id: PULSO_ID, name: "No Discriminación", code: "NDI", description: "Pulso: No Discriminación", sort_order: 22, category: "compensacion", theoretical_basis: "Colquitt 2001" },
  { id: "d4000000-0000-0000-0000-000000000014", instrument_id: PULSO_ID, name: "Cohesión de Equipo", code: "COH", description: "Pulso: Cohesión", sort_order: 14, category: "cultura", theoretical_basis: "Carron 1985" },
  { id: "d4000000-0000-0000-0000-000000000015", instrument_id: PULSO_ID, name: "Innovación y Cambio", code: "INN", description: "Pulso: Innovación", sort_order: 15, category: "cultura", theoretical_basis: "Edmondson 1999" },
  { id: "d4000000-0000-0000-0000-000000000016", instrument_id: PULSO_ID, name: "Resultados y Logros", code: "RES", description: "Pulso: Resultados", sort_order: 16, category: "cultura", theoretical_basis: "Locke & Latham 1990" },
  { id: "d4000000-0000-0000-0000-000000000017", instrument_id: PULSO_ID, name: "Desarrollo Profesional", code: "DES", description: "Pulso: Desarrollo", sort_order: 17, category: "cultura", theoretical_basis: "Kraimer 2011" },
  { id: "d4000000-0000-0000-0000-000000000018", instrument_id: PULSO_ID, name: "Engagement y Compromiso", code: "ENG", description: "Pulso: Engagement", sort_order: 18, category: "engagement", theoretical_basis: "UWES-9" },
  { id: "d4000000-0000-0000-0000-000000000019", instrument_id: PULSO_ID, name: "Claridad de Rol", code: "ROL", description: "Pulso: Claridad de Rol", sort_order: 19, category: "direccion", theoretical_basis: "Rizzo 1970" },
  { id: "d4000000-0000-0000-0000-000000000020", instrument_id: PULSO_ID, name: "Demandas Laborales", code: "DEM", description: "Pulso: Demandas Laborales", sort_order: 20, category: "bienestar", theoretical_basis: "JD-R Model" },
  { id: "d4000000-0000-0000-0000-000000000021", instrument_id: PULSO_ID, name: "Aprendizaje Organizacional", code: "APR", description: "Pulso: Aprendizaje Organizacional", sort_order: 21, category: "cultura", theoretical_basis: "Senge 1990" },
];

// ============================================================
// Module Dimensions (3) — already exist in production but re-upsert
// ============================================================
const MODULE_DIMENSIONS = [
  { id: "d5000000-0000-0000-0000-000000000001", instrument_id: CAM_ID, name: "Gestión del Cambio", code: "CAM", description: "Disposición, actitud y proactividad frente al cambio organizacional.", sort_order: 1, category: null, theoretical_basis: "Change Readiness (Armenakis 1993), Resistance to Change (Oreg 2003)" },
  { id: "d5000000-0000-0000-0000-000000000002", instrument_id: CLI_ID, name: "Orientación al Cliente", code: "CLI", description: "Enfoque estratégico, compromiso y cultura centrada en el cliente.", sort_order: 1, category: null, theoretical_basis: "Customer Orientation (Narver & Slater 1990), Service Climate (Schneider 1998)" },
  { id: "d5000000-0000-0000-0000-000000000003", instrument_id: DIG_ID, name: "Preparación Digital", code: "DIG", description: "Comprensión, capacitación y adopción de nuevas tecnologías.", sort_order: 1, category: null, theoretical_basis: "Technology Acceptance Model (Davis 1989), Digital Readiness (Parasuraman 2000)" },
];

// ============================================================
// Core Items v4.0 (111 total: 109 regular + 2 attention checks)
// ============================================================
const CORE_ITEMS = [
  // ORG (4 items)
  { id: "e3000000-0000-0000-0000-000000000001", dimension_id: "d3000000-0000-0000-0000-000000000001", text: "Me siento orgulloso/a de pertenecer a esta organización.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 1 },
  { id: "e3000000-0000-0000-0000-000000000002", dimension_id: "d3000000-0000-0000-0000-000000000001", text: "Recomendaría esta organización como un buen lugar para trabajar.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 2 },
  { id: "e3000000-0000-0000-0000-000000000003", dimension_id: "d3000000-0000-0000-0000-000000000001", text: "Los valores de la organización son compatibles con los míos.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 3 },
  { id: "e3000000-0000-0000-0000-000000000004", dimension_id: "d3000000-0000-0000-0000-000000000001", text: "Frecuentemente considero buscar empleo en otra organización.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 4 },

  // PRO (5 items - 4 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000005", dimension_id: "d3000000-0000-0000-0000-000000000002", text: "Mi trabajo tiene un propósito claro que me motiva.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 5 },
  { id: "e3000000-0000-0000-0000-000000000006", dimension_id: "d3000000-0000-0000-0000-000000000002", text: "Entiendo cómo mi trabajo contribuye a los objetivos de la organización.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 6 },
  { id: "e3000000-0000-0000-0000-000000000007", dimension_id: "d3000000-0000-0000-0000-000000000002", text: "Las tareas que realizo son significativas y relevantes.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 7 },
  { id: "e3000000-0000-0000-0000-000000000008", dimension_id: "d3000000-0000-0000-0000-000000000002", text: "Siento que mi trabajo no tiene impacto real en la organización.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 8 },
  { id: "e3000000-0000-0000-0000-000000000094", dimension_id: "d3000000-0000-0000-0000-000000000002", text: "Siento que mi trabajo contribuye positivamente a la vida de otras personas o a la comunidad.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 94 },

  // SEG (5 items - 4 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000009", dimension_id: "d3000000-0000-0000-0000-000000000003", text: "Me siento seguro/a emocional y psicológicamente en mi lugar de trabajo.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 9 },
  { id: "e3000000-0000-0000-0000-000000000010", dimension_id: "d3000000-0000-0000-0000-000000000003", text: "La organización se preocupa genuinamente por mi bienestar.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 10 },
  { id: "e3000000-0000-0000-0000-000000000011", dimension_id: "d3000000-0000-0000-0000-000000000003", text: "Puedo expresar mis preocupaciones sin temor a represalias.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 11 },
  { id: "e3000000-0000-0000-0000-000000000012", dimension_id: "d3000000-0000-0000-0000-000000000003", text: "En esta organización, cometer un error puede tener consecuencias desproporcionadas.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 12 },
  { id: "e3000000-0000-0000-0000-000000000085", dimension_id: "d3000000-0000-0000-0000-000000000003", text: "Las instalaciones y el entorno físico facilitan un buen ambiente de trabajo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 85 },

  // BAL (4 items)
  { id: "e3000000-0000-0000-0000-000000000013", dimension_id: "d3000000-0000-0000-0000-000000000004", text: "Puedo mantener un equilibrio saludable entre mi vida personal y laboral.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 13 },
  { id: "e3000000-0000-0000-0000-000000000014", dimension_id: "d3000000-0000-0000-0000-000000000004", text: "Mi carga de trabajo me permite cumplir con mis responsabilidades personales.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 14 },
  { id: "e3000000-0000-0000-0000-000000000015", dimension_id: "d3000000-0000-0000-0000-000000000004", text: "La organización respeta mi tiempo fuera del horario laboral.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 15 },
  { id: "e3000000-0000-0000-0000-000000000016", dimension_id: "d3000000-0000-0000-0000-000000000004", text: "Frecuentemente siento que el trabajo invade mi tiempo personal.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 16 },

  // CUI (5 items - 4 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000017", dimension_id: "d3000000-0000-0000-0000-000000000005", text: "En mi equipo nos apoyamos mutuamente cuando alguien tiene dificultades.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 17 },
  { id: "e3000000-0000-0000-0000-000000000018", dimension_id: "d3000000-0000-0000-0000-000000000005", text: "La organización ofrece recursos adecuados para el bienestar de sus empleados.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 18 },
  { id: "e3000000-0000-0000-0000-000000000019", dimension_id: "d3000000-0000-0000-0000-000000000005", text: "Mis compañeros se preocupan genuinamente por mi bienestar.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 19 },
  { id: "e3000000-0000-0000-0000-000000000020", dimension_id: "d3000000-0000-0000-0000-000000000005", text: "Cuando tengo un problema personal, siento que no cuento con apoyo en el trabajo.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 20 },
  { id: "e3000000-0000-0000-0000-000000000086", dimension_id: "d3000000-0000-0000-0000-000000000005", text: "Confío en la honestidad y buenas intenciones de mis compañeros de trabajo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 86 },

  // LID (6 items - 5 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000021", dimension_id: "d3000000-0000-0000-0000-000000000006", text: "Mi supervisor me brinda retroalimentación específica que me ayuda a mejorar.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 21 },
  { id: "e3000000-0000-0000-0000-000000000022", dimension_id: "d3000000-0000-0000-0000-000000000006", text: "Puedo acudir a mi supervisor cuando necesito apoyo o tengo una dificultad.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 22 },
  { id: "e3000000-0000-0000-0000-000000000023", dimension_id: "d3000000-0000-0000-0000-000000000006", text: "Mi supervisor demuestra con sus acciones lo que espera del equipo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 23 },
  { id: "e3000000-0000-0000-0000-000000000024", dimension_id: "d3000000-0000-0000-0000-000000000006", text: "Mi supervisor se interesa genuinamente en mi crecimiento profesional.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 24 },
  { id: "e3000000-0000-0000-0000-000000000025", dimension_id: "d3000000-0000-0000-0000-000000000006", text: "Mi supervisor rara vez está disponible cuando lo necesito.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 25 },
  { id: "e3000000-0000-0000-0000-000000000083", dimension_id: "d3000000-0000-0000-0000-000000000006", text: "Mi supervisor cumple los compromisos que adquiere con el equipo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 83 },

  // AUT (5 items - 4 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000026", dimension_id: "d3000000-0000-0000-0000-000000000007", text: "Tengo la libertad de decidir cómo organizar y realizar mi trabajo.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 26 },
  { id: "e3000000-0000-0000-0000-000000000027", dimension_id: "d3000000-0000-0000-0000-000000000007", text: "Puedo tomar decisiones importantes relacionadas con mis tareas sin aprobación excesiva.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 27 },
  { id: "e3000000-0000-0000-0000-000000000028", dimension_id: "d3000000-0000-0000-0000-000000000007", text: "Mi supervisor confía en mi criterio para resolver problemas.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 28 },
  { id: "e3000000-0000-0000-0000-000000000029", dimension_id: "d3000000-0000-0000-0000-000000000007", text: "Siento que me supervisan en exceso, sin permitirme trabajar de forma independiente.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 29 },
  { id: "e3000000-0000-0000-0000-000000000084", dimension_id: "d3000000-0000-0000-0000-000000000007", text: "Mi supervisor nos involucra en las decisiones que afectan nuestro trabajo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 84 },

  // COM (5 items - 4 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000030", dimension_id: "d3000000-0000-0000-0000-000000000008", text: "La comunicación en la organización es clara, oportuna y transparente.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 30 },
  { id: "e3000000-0000-0000-0000-000000000031", dimension_id: "d3000000-0000-0000-0000-000000000008", text: "Tengo acceso a la información que necesito para hacer bien mi trabajo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 31 },
  { id: "e3000000-0000-0000-0000-000000000032", dimension_id: "d3000000-0000-0000-0000-000000000008", text: "Existen canales efectivos para expresar mis ideas y sugerencias.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 32 },
  { id: "e3000000-0000-0000-0000-000000000033", dimension_id: "d3000000-0000-0000-0000-000000000008", text: "Me entero de decisiones importantes por rumores en lugar de por canales oficiales.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 33 },
  { id: "e3000000-0000-0000-0000-000000000087", dimension_id: "d3000000-0000-0000-0000-000000000008", text: "En esta organización, dar y recibir retroalimentación constructiva es algo normal y valorado.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 87 },

  // CON (5 items - 4 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000034", dimension_id: "d3000000-0000-0000-0000-000000000009", text: "Confío en las decisiones que toma la alta dirección de la organización.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 34 },
  { id: "e3000000-0000-0000-0000-000000000035", dimension_id: "d3000000-0000-0000-0000-000000000009", text: "La dirección actúa de manera coherente con lo que comunica.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 35 },
  { id: "e3000000-0000-0000-0000-000000000036", dimension_id: "d3000000-0000-0000-0000-000000000009", text: "Tengo confianza en la dirección estratégica de la organización.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 36 },
  { id: "e3000000-0000-0000-0000-000000000037", dimension_id: "d3000000-0000-0000-0000-000000000009", text: "Siento que la dirección no es transparente sobre la situación real de la organización.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 37 },
  { id: "e3000000-0000-0000-0000-000000000088", dimension_id: "d3000000-0000-0000-0000-000000000009", text: "Todas las personas son tratadas con respeto independientemente de su nivel jerárquico.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 88 },

  // CMP (4 items)
  { id: "e3000000-0000-0000-0000-000000000038", dimension_id: "d3000000-0000-0000-0000-000000000010", text: "Considero que mi compensación es justa en relación con mi trabajo y responsabilidades.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 38 },
  { id: "e3000000-0000-0000-0000-000000000039", dimension_id: "d3000000-0000-0000-0000-000000000010", text: "Mi salario es competitivo comparado con posiciones similares en el mercado.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 39 },
  { id: "e3000000-0000-0000-0000-000000000040", dimension_id: "d3000000-0000-0000-0000-000000000010", text: "Entiendo claramente cómo se determina mi compensación.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 40 },
  { id: "e3000000-0000-0000-0000-000000000041", dimension_id: "d3000000-0000-0000-0000-000000000010", text: "Siento que no me pagan lo justo por el trabajo que realizo.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 41 },

  // REC (4 items)
  { id: "e3000000-0000-0000-0000-000000000042", dimension_id: "d3000000-0000-0000-0000-000000000011", text: "Recibo reconocimiento oportuno cuando hago un buen trabajo.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 42 },
  { id: "e3000000-0000-0000-0000-000000000043", dimension_id: "d3000000-0000-0000-0000-000000000011", text: "La organización valora y celebra los logros de sus empleados.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 43 },
  { id: "e3000000-0000-0000-0000-000000000044", dimension_id: "d3000000-0000-0000-0000-000000000011", text: "Mi supervisor reconoce mis contribuciones al equipo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 44 },
  { id: "e3000000-0000-0000-0000-000000000045", dimension_id: "d3000000-0000-0000-0000-000000000011", text: "Mi esfuerzo adicional pasa desapercibido en esta organización.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 45 },

  // BEN (4 items)
  { id: "e3000000-0000-0000-0000-000000000046", dimension_id: "d3000000-0000-0000-0000-000000000012", text: "Los beneficios que ofrece la organización responden a mis necesidades.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 46 },
  { id: "e3000000-0000-0000-0000-000000000047", dimension_id: "d3000000-0000-0000-0000-000000000012", text: "Conozco y aprovecho los beneficios disponibles para mí.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 47 },
  { id: "e3000000-0000-0000-0000-000000000048", dimension_id: "d3000000-0000-0000-0000-000000000012", text: "La organización invierte en beneficios que mejoran mi calidad de vida.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 48 },
  { id: "e3000000-0000-0000-0000-000000000049", dimension_id: "d3000000-0000-0000-0000-000000000012", text: "Los beneficios de esta organización son inferiores a los de empresas similares.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 49 },

  // EQA (6 items - 4 original + 2 extensions)
  { id: "e3000000-0000-0000-0000-000000000050", dimension_id: "d3000000-0000-0000-0000-000000000013", text: "Los procesos de promoción en la organización son transparentes y justos.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 50 },
  { id: "e3000000-0000-0000-0000-000000000051", dimension_id: "d3000000-0000-0000-0000-000000000013", text: "Todos los empleados tienen las mismas oportunidades de desarrollo y ascenso.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 51 },
  { id: "e3000000-0000-0000-0000-000000000052", dimension_id: "d3000000-0000-0000-0000-000000000013", text: "Las decisiones de promoción se basan en el mérito y desempeño.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 52 },
  { id: "e3000000-0000-0000-0000-000000000053", dimension_id: "d3000000-0000-0000-0000-000000000013", text: "En esta organización, los ascensos dependen más de relaciones que de resultados.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 53 },
  { id: "e3000000-0000-0000-0000-000000000089", dimension_id: "d3000000-0000-0000-0000-000000000013", text: "Si considero que he sido tratado/a injustamente, confío en que existe un proceso justo para ser escuchado/a.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 89 },
  { id: "e3000000-0000-0000-0000-000000000090", dimension_id: "d3000000-0000-0000-0000-000000000013", text: "En general, las oportunidades y recompensas se distribuyen de forma justa en relación con el aporte de cada persona.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 90 },

  // NDI (6 items - 5 original + 1 reverse)
  { id: "e3000000-0000-0000-0000-000000000054", dimension_id: "d3000000-0000-0000-0000-000000000022", text: "Las personas son tratadas con justicia independientemente de su edad.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 54 },
  { id: "e3000000-0000-0000-0000-000000000055", dimension_id: "d3000000-0000-0000-0000-000000000022", text: "Las personas son tratadas con justicia independientemente de su raza o etnia.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 55 },
  { id: "e3000000-0000-0000-0000-000000000056", dimension_id: "d3000000-0000-0000-0000-000000000022", text: "Las personas son tratadas con justicia independientemente de su género.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 56 },
  { id: "e3000000-0000-0000-0000-000000000057", dimension_id: "d3000000-0000-0000-0000-000000000022", text: "Las personas son tratadas con justicia independientemente de su orientación sexual.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 57 },
  { id: "e3000000-0000-0000-0000-000000000058", dimension_id: "d3000000-0000-0000-0000-000000000022", text: "Las personas son tratadas con justicia independientemente de su condición socioeconómica.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 58 },
  { id: "e3000000-0000-0000-0000-000000000110", dimension_id: "d3000000-0000-0000-0000-000000000022", text: "He presenciado situaciones en las que alguien fue tratado de forma diferente por sus características personales.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 110 },

  // COH (6 items - 4 original + 2 extensions)
  { id: "e3000000-0000-0000-0000-000000000059", dimension_id: "d3000000-0000-0000-0000-000000000014", text: "En mi equipo trabajamos de manera colaborativa para alcanzar los objetivos.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 59 },
  { id: "e3000000-0000-0000-0000-000000000060", dimension_id: "d3000000-0000-0000-0000-000000000014", text: "Existe un fuerte sentido de compañerismo en mi equipo de trabajo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 60 },
  { id: "e3000000-0000-0000-0000-000000000061", dimension_id: "d3000000-0000-0000-0000-000000000014", text: "Los conflictos en mi equipo se resuelven de manera constructiva.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 61 },
  { id: "e3000000-0000-0000-0000-000000000062", dimension_id: "d3000000-0000-0000-0000-000000000014", text: "En mi equipo, cada quien trabaja de forma aislada sin colaboración real.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 62 },
  { id: "e3000000-0000-0000-0000-000000000091", dimension_id: "d3000000-0000-0000-0000-000000000014", text: "Cuando alguien se integra al equipo, nos aseguramos de que se sienta bienvenido/a y apoyado/a.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 91 },
  { id: "e3000000-0000-0000-0000-000000000092", dimension_id: "d3000000-0000-0000-0000-000000000014", text: "En esta organización celebramos los logros y momentos especiales como equipo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 92 },

  // INN (6 items - 5 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000063", dimension_id: "d3000000-0000-0000-0000-000000000015", text: "En esta organización se fomenta la innovación y las nuevas ideas.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 63 },
  { id: "e3000000-0000-0000-0000-000000000064", dimension_id: "d3000000-0000-0000-0000-000000000015", text: "Me siento seguro/a proponiendo ideas nuevas, aunque puedan fallar.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 64 },
  { id: "e3000000-0000-0000-0000-000000000065", dimension_id: "d3000000-0000-0000-0000-000000000015", text: "La organización se adapta eficazmente a los cambios del entorno.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 65 },
  { id: "e3000000-0000-0000-0000-000000000066", dimension_id: "d3000000-0000-0000-0000-000000000015", text: "Contamos con herramientas y recursos para implementar mejoras.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 66 },
  { id: "e3000000-0000-0000-0000-000000000067", dimension_id: "d3000000-0000-0000-0000-000000000015", text: "Las nuevas ideas rara vez se implementan en esta organización.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 67 },
  { id: "e3000000-0000-0000-0000-000000000093", dimension_id: "d3000000-0000-0000-0000-000000000015", text: "En mi equipo, expresar una opinión diferente a la mayoría es visto como una contribución valiosa.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 93 },

  // RES (5 items - 4 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000068", dimension_id: "d3000000-0000-0000-0000-000000000016", text: "Tengo claridad sobre los objetivos que debo alcanzar en mi puesto.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 68 },
  { id: "e3000000-0000-0000-0000-000000000069", dimension_id: "d3000000-0000-0000-0000-000000000016", text: "Cuento con los recursos necesarios para lograr los resultados esperados.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 69 },
  { id: "e3000000-0000-0000-0000-000000000070", dimension_id: "d3000000-0000-0000-0000-000000000016", text: "Los logros del equipo son reconocidos y compartidos.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 70 },
  { id: "e3000000-0000-0000-0000-000000000071", dimension_id: "d3000000-0000-0000-0000-000000000016", text: "Los objetivos que me piden alcanzar no son realistas con los recursos disponibles.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 71 },
  { id: "e3000000-0000-0000-0000-000000000112", dimension_id: "d3000000-0000-0000-0000-000000000016", text: "En esta organización, el compromiso con la satisfacción de nuestros clientes o usuarios es claro y compartido.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 112 },

  // DES (4 items)
  { id: "e3000000-0000-0000-0000-000000000072", dimension_id: "d3000000-0000-0000-0000-000000000017", text: "La organización me ofrece oportunidades reales de desarrollo profesional.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 72 },
  { id: "e3000000-0000-0000-0000-000000000073", dimension_id: "d3000000-0000-0000-0000-000000000017", text: "Tengo un plan de carrera claro dentro de la organización.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 73 },
  { id: "e3000000-0000-0000-0000-000000000074", dimension_id: "d3000000-0000-0000-0000-000000000017", text: "Las capacitaciones que recibo son relevantes para mi crecimiento.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 74 },
  { id: "e3000000-0000-0000-0000-000000000075", dimension_id: "d3000000-0000-0000-0000-000000000017", text: "Siento que estoy estancado/a profesionalmente en esta organización.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 75 },

  // ENG (5 items - 4 original + 1 extension)
  { id: "e3000000-0000-0000-0000-000000000076", dimension_id: "d3000000-0000-0000-0000-000000000018", text: "Me siento entusiasmado/a con mi trabajo cada día.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 76 },
  { id: "e3000000-0000-0000-0000-000000000077", dimension_id: "d3000000-0000-0000-0000-000000000018", text: "Me siento conectado/a emocionalmente con la misión de la organización.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 77 },
  { id: "e3000000-0000-0000-0000-000000000078", dimension_id: "d3000000-0000-0000-0000-000000000018", text: "Estoy dispuesto/a a dar un esfuerzo adicional por el éxito de la organización.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 78 },
  { id: "e3000000-0000-0000-0000-000000000079", dimension_id: "d3000000-0000-0000-0000-000000000018", text: "Frecuentemente me siento desmotivado/a y desconectado/a de mi trabajo.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 79 },
  { id: "e3000000-0000-0000-0000-000000000095", dimension_id: "d3000000-0000-0000-0000-000000000018", text: "Resulta estimulante y desafiante trabajar en esta organización.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 95 },

  // ROL (5 items)
  { id: "e3000000-0000-0000-0000-000000000096", dimension_id: "d3000000-0000-0000-0000-000000000019", text: "Tengo claridad sobre mis responsabilidades y los límites de mi rol.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 96 },
  { id: "e3000000-0000-0000-0000-000000000097", dimension_id: "d3000000-0000-0000-0000-000000000019", text: "Sé exactamente lo que se espera de mí en mi puesto de trabajo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 97 },
  { id: "e3000000-0000-0000-0000-000000000098", dimension_id: "d3000000-0000-0000-0000-000000000019", text: "Comprendo cómo mi área contribuye a la dirección estratégica de la organización.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 98 },
  { id: "e3000000-0000-0000-0000-000000000099", dimension_id: "d3000000-0000-0000-0000-000000000019", text: "Las expectativas sobre mi desempeño son confusas o contradictorias.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 99 },
  { id: "e3000000-0000-0000-0000-000000000103", dimension_id: "d3000000-0000-0000-0000-000000000019", text: "Las tareas que realizo corresponden a lo que se espera de mi rol.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 103 },

  // DEM (4 items)
  { id: "e3000000-0000-0000-0000-000000000100", dimension_id: "d3000000-0000-0000-0000-000000000020", text: "Mi carga de trabajo es manejable y razonable.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 100 },
  { id: "e3000000-0000-0000-0000-000000000101", dimension_id: "d3000000-0000-0000-0000-000000000020", text: "Los procesos y sistemas de la organización facilitan mi trabajo en lugar de obstaculizarlo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 101 },
  { id: "e3000000-0000-0000-0000-000000000102", dimension_id: "d3000000-0000-0000-0000-000000000020", text: "La presión por cumplir plazos en mi puesto es excesiva.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 102 },
  { id: "e3000000-0000-0000-0000-000000000111", dimension_id: "d3000000-0000-0000-0000-000000000020", text: "Cuento con el tiempo suficiente para realizar mi trabajo con calidad.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 111 },

  // APR (4 items)
  { id: "e3000000-0000-0000-0000-000000000104", dimension_id: "d3000000-0000-0000-0000-000000000021", text: "En esta organización aprendemos de nuestros errores y aplicamos esas lecciones para mejorar.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 104 },
  { id: "e3000000-0000-0000-0000-000000000105", dimension_id: "d3000000-0000-0000-0000-000000000021", text: "El conocimiento y las mejores prácticas se comparten efectivamente entre equipos.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 105 },
  { id: "e3000000-0000-0000-0000-000000000106", dimension_id: "d3000000-0000-0000-0000-000000000021", text: "La organización invierte en la mejora continua de sus procesos y prácticas.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 106 },
  { id: "e3000000-0000-0000-0000-000000000107", dimension_id: "d3000000-0000-0000-0000-000000000021", text: "Los errores se ocultan en lugar de usarse como oportunidades de mejora.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 107 },

  // ATTENTION CHECKS (2)
  { id: "e3000000-0000-0000-0000-000000000080", dimension_id: "d3000000-0000-0000-0000-000000000003", text: 'Para verificar que estás leyendo con atención, selecciona "De acuerdo".', is_reverse: false, is_anchor: false, is_attention_check: true, sort_order: 108 },
  { id: "e3000000-0000-0000-0000-000000000081", dimension_id: "d3000000-0000-0000-0000-000000000016", text: 'Esta es una pregunta de verificación, selecciona "En desacuerdo".', is_reverse: false, is_anchor: false, is_attention_check: true, sort_order: 109 },
];

// ============================================================
// Pulso Items v4.0 (22 anchor items)
// ============================================================
const PULSO_ITEMS = [
  { id: "e4000000-0000-0000-0000-000000000001", dimension_id: "d4000000-0000-0000-0000-000000000001", text: "Me siento orgulloso/a de pertenecer a esta organización.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 1 },
  { id: "e4000000-0000-0000-0000-000000000002", dimension_id: "d4000000-0000-0000-0000-000000000002", text: "Mi trabajo tiene un propósito claro que me motiva.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 2 },
  { id: "e4000000-0000-0000-0000-000000000003", dimension_id: "d4000000-0000-0000-0000-000000000003", text: "Me siento seguro/a emocional y psicológicamente en mi lugar de trabajo.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 3 },
  { id: "e4000000-0000-0000-0000-000000000004", dimension_id: "d4000000-0000-0000-0000-000000000004", text: "Puedo mantener un equilibrio saludable entre mi vida personal y laboral.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 4 },
  { id: "e4000000-0000-0000-0000-000000000005", dimension_id: "d4000000-0000-0000-0000-000000000005", text: "En mi equipo nos apoyamos mutuamente cuando alguien tiene dificultades.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 5 },
  { id: "e4000000-0000-0000-0000-000000000006", dimension_id: "d4000000-0000-0000-0000-000000000006", text: "Mi supervisor me brinda retroalimentación específica que me ayuda a mejorar.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 6 },
  { id: "e4000000-0000-0000-0000-000000000007", dimension_id: "d4000000-0000-0000-0000-000000000007", text: "Tengo la libertad de decidir cómo organizar y realizar mi trabajo.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 7 },
  { id: "e4000000-0000-0000-0000-000000000008", dimension_id: "d4000000-0000-0000-0000-000000000008", text: "La comunicación en la organización es clara, oportuna y transparente.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 8 },
  { id: "e4000000-0000-0000-0000-000000000009", dimension_id: "d4000000-0000-0000-0000-000000000009", text: "Confío en las decisiones que toma la alta dirección de la organización.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 9 },
  { id: "e4000000-0000-0000-0000-000000000010", dimension_id: "d4000000-0000-0000-0000-000000000010", text: "Considero que mi compensación es justa en relación con mi trabajo y responsabilidades.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 10 },
  { id: "e4000000-0000-0000-0000-000000000011", dimension_id: "d4000000-0000-0000-0000-000000000011", text: "Recibo reconocimiento oportuno cuando hago un buen trabajo.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 11 },
  { id: "e4000000-0000-0000-0000-000000000012", dimension_id: "d4000000-0000-0000-0000-000000000012", text: "Los beneficios que ofrece la organización responden a mis necesidades.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 12 },
  { id: "e4000000-0000-0000-0000-000000000013", dimension_id: "d4000000-0000-0000-0000-000000000013", text: "Los procesos de promoción en la organización son transparentes y justos.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 13 },
  { id: "e4000000-0000-0000-0000-000000000014", dimension_id: "d4000000-0000-0000-0000-000000000014", text: "En mi equipo trabajamos de manera colaborativa para alcanzar los objetivos.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 14 },
  { id: "e4000000-0000-0000-0000-000000000015", dimension_id: "d4000000-0000-0000-0000-000000000015", text: "En esta organización se fomenta la innovación y las nuevas ideas.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 15 },
  { id: "e4000000-0000-0000-0000-000000000016", dimension_id: "d4000000-0000-0000-0000-000000000016", text: "Tengo claridad sobre los objetivos que debo alcanzar en mi puesto.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 16 },
  { id: "e4000000-0000-0000-0000-000000000017", dimension_id: "d4000000-0000-0000-0000-000000000017", text: "La organización me ofrece oportunidades reales de desarrollo profesional.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 17 },
  { id: "e4000000-0000-0000-0000-000000000018", dimension_id: "d4000000-0000-0000-0000-000000000018", text: "Me siento entusiasmado/a con mi trabajo cada día.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 18 },
  { id: "e4000000-0000-0000-0000-000000000019", dimension_id: "d4000000-0000-0000-0000-000000000019", text: "Tengo claridad sobre mis responsabilidades y los límites de mi rol.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 19 },
  { id: "e4000000-0000-0000-0000-000000000020", dimension_id: "d4000000-0000-0000-0000-000000000020", text: "Mi carga de trabajo es manejable y razonable.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 20 },
  { id: "e4000000-0000-0000-0000-000000000021", dimension_id: "d4000000-0000-0000-0000-000000000021", text: "En esta organización aprendemos de nuestros errores y aplicamos esas lecciones para mejorar.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 21 },
  { id: "e4000000-0000-0000-0000-000000000022", dimension_id: "d4000000-0000-0000-0000-000000000022", text: "Las personas son tratadas con justicia independientemente de su edad.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 22 },
];

// ============================================================
// Module Items (16 total)
// ============================================================
const MODULE_ITEMS = [
  // CAM (8 items)
  { id: "e5000000-0000-0000-0000-000000000001", dimension_id: "d5000000-0000-0000-0000-000000000001", text: "Frente a los procesos de cambio, tengo ciertas resistencias cuando se trata de aprender nuevas formas de trabajo.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 1 },
  { id: "e5000000-0000-0000-0000-000000000002", dimension_id: "d5000000-0000-0000-0000-000000000001", text: "Frente a los cambios organizacionales, no me siento del todo cómodo/a.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 2 },
  { id: "e5000000-0000-0000-0000-000000000003", dimension_id: "d5000000-0000-0000-0000-000000000001", text: "Prefiero seguir las instrucciones establecidas en lugar de participar activamente en los procesos de cambio.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 3 },
  { id: "e5000000-0000-0000-0000-000000000004", dimension_id: "d5000000-0000-0000-0000-000000000001", text: "Me siento cómodo/a manteniendo una postura neutral frente a los nuevos cambios que se presentan.", is_reverse: true, is_anchor: false, is_attention_check: false, sort_order: 4 },
  { id: "e5000000-0000-0000-0000-000000000005", dimension_id: "d5000000-0000-0000-0000-000000000001", text: "Me gustan los nuevos desafíos y siempre busco comprometerme desde mi rol para aportar al cambio organizacional.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 5 },
  { id: "e5000000-0000-0000-0000-000000000006", dimension_id: "d5000000-0000-0000-0000-000000000001", text: "Considero que soy proactivo/a frente a los cambios y procuro exponer mi punto de vista e iniciativas.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 6 },
  { id: "e5000000-0000-0000-0000-000000000007", dimension_id: "d5000000-0000-0000-0000-000000000001", text: "Mis mayores fortalezas aparecen cuando me toca liderar el cambio.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 7 },
  { id: "e5000000-0000-0000-0000-000000000008", dimension_id: "d5000000-0000-0000-0000-000000000001", text: "Tengo claridad sobre los beneficios del cambio y me motiva acompañar a mis colegas en este camino.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 8 },

  // CLI (4 items)
  { id: "e5000000-0000-0000-0000-000000000009", dimension_id: "d5000000-0000-0000-0000-000000000002", text: "La organización demuestra un enfoque claro y estratégico para mejorar la experiencia de sus clientes.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 1 },
  { id: "e5000000-0000-0000-0000-000000000010", dimension_id: "d5000000-0000-0000-0000-000000000002", text: "El compromiso con la resolución efectiva de los problemas de los clientes es claro y compartido por todas las áreas.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 2 },
  { id: "e5000000-0000-0000-0000-000000000011", dimension_id: "d5000000-0000-0000-0000-000000000002", text: "Las decisiones que toma la organización reflejan una comprensión profunda de las necesidades del cliente.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 3 },
  { id: "e5000000-0000-0000-0000-000000000012", dimension_id: "d5000000-0000-0000-0000-000000000002", text: "La organización pone al cliente en el centro de sus estrategias y procesos.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 4 },

  // DIG (4 items)
  { id: "e5000000-0000-0000-0000-000000000013", dimension_id: "d5000000-0000-0000-0000-000000000003", text: "Comprendo cómo las nuevas tecnologías pueden mejorar mi trabajo diario en mi área.", is_reverse: false, is_anchor: true, is_attention_check: false, sort_order: 1 },
  { id: "e5000000-0000-0000-0000-000000000014", dimension_id: "d5000000-0000-0000-0000-000000000003", text: "La organización me ha proporcionado información y capacitación sobre el impacto de las nuevas tecnologías.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 2 },
  { id: "e5000000-0000-0000-0000-000000000015", dimension_id: "d5000000-0000-0000-0000-000000000003", text: "Me siento entusiasmado/a con las herramientas tecnológicas que la organización implementa.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 3 },
  { id: "e5000000-0000-0000-0000-000000000016", dimension_id: "d5000000-0000-0000-0000-000000000003", text: "La organización invierte adecuadamente en tecnología que facilita nuestro trabajo.", is_reverse: false, is_anchor: false, is_attention_check: false, sort_order: 4 },
];

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("=== Seed Production Instruments (v4.0) ===\n");

  // Step 1: Delete all campaign-related data (cascading from innermost)
  console.log("Step 1: Cleaning campaign data...");

  const tables = [
    "open_responses",
    "responses",
    "campaign_results",
    "campaign_analytics",
    "business_indicators",
    "participants",
    "respondents",
    "campaigns",
  ];

  for (const table of tables) {
    const { error, count } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
    if (error) {
      // Try gte for tables that might have different PK
      const { error: err2 } = await supabase.from(table).delete().gte("created_at", "1970-01-01");
      if (err2) console.error(`  WARNING: ${table}: ${err2.message}`);
      else console.log(`  Cleaned ${table}`);
    } else {
      console.log(`  Cleaned ${table}`);
    }
  }

  // Step 2: Delete all existing items
  console.log("\nStep 2: Deleting old items...");
  const { error: delItems } = await supabase.from("items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delItems) console.error(`  ERROR deleting items: ${delItems.message}`);
  else console.log("  Deleted all items");

  // Step 3: Delete all existing dimensions
  console.log("\nStep 3: Deleting old dimensions...");
  const { error: delDims } = await supabase.from("dimensions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delDims) console.error(`  ERROR deleting dimensions: ${delDims.message}`);
  else console.log("  Deleted all dimensions");

  // Step 4: Update instruments (ensure instrument_type is set)
  console.log("\nStep 4: Updating instruments...");
  const instruments = [
    { id: CORE_ID, name: "ClimaLab Core", slug: "climalab-core", description: "Instrumento completo de medición de clima organizacional. 22 dimensiones en 4 categorías + Engagement, ~109 ítems + 2 verificaciones de atención. Diseño basado en evidencia psicométrica.", mode: "full", target_size: "all", version: "4.0", instrument_type: "base" },
    { id: PULSO_ID, name: "ClimaLab Pulso", slug: "climalab-pulso", description: "Instrumento de pulso para seguimiento frecuente. 1 ítem ancla por dimensión = 22 ítems.", mode: "pulse", target_size: "all", version: "4.0", instrument_type: "base" },
    { id: CAM_ID, name: "Módulo: Gestión del Cambio", slug: "modulo-gestion-cambio", description: "Módulo opcional de 8 ítems para evaluar la disposición y actitud frente al cambio organizacional.", mode: "full", target_size: "all", version: "1.0", instrument_type: "module" },
    { id: CLI_ID, name: "Módulo: Orientación al Cliente", slug: "modulo-orientacion-cliente", description: "Módulo opcional de 4 ítems para evaluar el enfoque y compromiso organizacional con el cliente.", mode: "full", target_size: "all", version: "1.0", instrument_type: "module" },
    { id: DIG_ID, name: "Módulo: Preparación Digital", slug: "modulo-preparacion-digital", description: "Módulo opcional de 4 ítems para evaluar la preparación y adopción tecnológica de la organización.", mode: "full", target_size: "all", version: "1.0", instrument_type: "module" },
  ];

  for (const inst of instruments) {
    const { error } = await supabase.from("instruments").upsert(inst, { onConflict: "id" });
    if (error) console.error(`  ERROR upserting ${inst.name}: ${error.message}`);
    else console.log(`  Upserted ${inst.name}`);
  }

  // Step 5: Insert Core dimensions
  console.log("\nStep 5: Inserting Core dimensions (22)...");
  const { error: coreErr } = await supabase.from("dimensions").insert(CORE_DIMENSIONS);
  if (coreErr) console.error(`  ERROR: ${coreErr.message}`);
  else console.log(`  Inserted ${CORE_DIMENSIONS.length} Core dimensions`);

  // Step 6: Insert Pulso dimensions
  console.log("\nStep 6: Inserting Pulso dimensions (22)...");
  const { error: pulsoErr } = await supabase.from("dimensions").insert(PULSO_DIMENSIONS);
  if (pulsoErr) console.error(`  ERROR: ${pulsoErr.message}`);
  else console.log(`  Inserted ${PULSO_DIMENSIONS.length} Pulso dimensions`);

  // Step 7: Insert Module dimensions
  console.log("\nStep 7: Inserting Module dimensions (3)...");
  const { error: modErr } = await supabase.from("dimensions").insert(MODULE_DIMENSIONS);
  if (modErr) console.error(`  ERROR: ${modErr.message}`);
  else console.log(`  Inserted ${MODULE_DIMENSIONS.length} Module dimensions`);

  // Step 8: Insert Core items (in batches of 30)
  console.log("\nStep 8: Inserting Core items (111)...");
  for (let i = 0; i < CORE_ITEMS.length; i += 30) {
    const batch = CORE_ITEMS.slice(i, i + 30);
    const { error } = await supabase.from("items").insert(batch);
    if (error) {
      console.error(`  ERROR batch ${i}-${i + batch.length}: ${error.message}`);
    }
  }
  console.log(`  Inserted ${CORE_ITEMS.length} Core items`);

  // Step 9: Insert Pulso items
  console.log("\nStep 9: Inserting Pulso items (22)...");
  const { error: pulsoItemErr } = await supabase.from("items").insert(PULSO_ITEMS);
  if (pulsoItemErr) console.error(`  ERROR: ${pulsoItemErr.message}`);
  else console.log(`  Inserted ${PULSO_ITEMS.length} Pulso items`);

  // Step 10: Insert Module items
  console.log("\nStep 10: Inserting Module items (16)...");
  const { error: modItemErr } = await supabase.from("items").insert(MODULE_ITEMS);
  if (modItemErr) console.error(`  ERROR: ${modItemErr.message}`);
  else console.log(`  Inserted ${MODULE_ITEMS.length} Module items`);

  // Verification
  console.log("\n=== Verification ===");
  const { data: dims } = await supabase.from("dimensions").select("id, instrument_id, code, category").order("instrument_id").order("sort_order");
  const coreDims = (dims || []).filter(d => d.instrument_id === CORE_ID);
  const pulsoDims = (dims || []).filter(d => d.instrument_id === PULSO_ID);
  const modDims = (dims || []).filter(d => [CAM_ID, CLI_ID, DIG_ID].includes(d.instrument_id));
  console.log(`Core dimensions: ${coreDims.length} (expected 22)`);
  console.log(`Pulso dimensions: ${pulsoDims.length} (expected 22)`);
  console.log(`Module dimensions: ${modDims.length} (expected 3)`);

  const { count: itemCount } = await supabase.from("items").select("*", { count: "exact", head: true });
  console.log(`Total items: ${itemCount} (expected 149)`);

  // Show categories
  const cats = {};
  for (const d of coreDims) {
    const cat = d.category || "null";
    cats[cat] = (cats[cat] || 0) + 1;
  }
  console.log("\nCore categories:", cats);

  console.log("\nDone! Production instruments match development.");
}

main().catch(console.error);

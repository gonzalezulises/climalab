#!/usr/bin/env node
/**
 * ClimaLab v4.0 — Demo Data Generator
 * Generates respondent + response SQL for 2 campaigns (Q3 2025 + Q1 2026).
 * Usage: node scripts/generate-demo-seed.mjs >> supabase/seed.sql
 */

// Seeded PRNG (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);

// Clamp to Likert 1-5
function clamp(v) {
  return Math.max(1, Math.min(5, Math.round(v)));
}

// UUID helpers
function respondentUUID(campaignIdx, n) {
  const prefix = campaignIdx === 0 ? "aa" : "ab";
  return `${prefix}000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function responseUUID(campaignIdx, n) {
  const prefix = campaignIdx === 0 ? "ba" : "bb";
  return `${prefix}000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function openResponseUUID(campaignIdx, n) {
  const prefix = campaignIdx === 0 ? "ca" : "cb";
  return `${prefix}000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

// Campaigns
const campaigns = [
  { id: "f0000000-0000-0000-0000-000000000001", idx: 0, respondentCount: 80, date: "2025-07-15" },
  { id: "f0000000-0000-0000-0000-000000000002", idx: 1, respondentCount: 120, date: "2026-01-25" },
];

// 22 dimension codes and their item IDs (v4.0 corrected)
const dimensions = [
  { code: "ORG", items: [1, 2, 3, 4], reverseItems: [4] },
  { code: "PRO", items: [5, 6, 7, 8, 94], reverseItems: [8] },
  { code: "SEG", items: [9, 10, 11, 12, 85], reverseItems: [12] },
  { code: "BAL", items: [13, 14, 15, 16], reverseItems: [16] },
  { code: "CUI", items: [17, 18, 19, 20, 86], reverseItems: [20] },
  { code: "LID", items: [21, 22, 23, 24, 25, 83], reverseItems: [25] },
  { code: "AUT", items: [26, 27, 28, 29, 84], reverseItems: [29] },
  { code: "COM", items: [30, 31, 32, 33, 87], reverseItems: [33] },
  { code: "CON", items: [34, 35, 36, 37, 88], reverseItems: [37] },
  { code: "CMP", items: [38, 39, 40, 41], reverseItems: [41] },
  { code: "REC", items: [42, 43, 44, 45], reverseItems: [45] },
  { code: "BEN", items: [46, 47, 48, 49], reverseItems: [49] },
  { code: "EQA", items: [50, 51, 52, 53, 89, 90], reverseItems: [53] },
  { code: "NDI", items: [54, 55, 56, 57, 58, 110], reverseItems: [110] },
  { code: "COH", items: [59, 60, 61, 62, 91, 92], reverseItems: [62] },
  { code: "INN", items: [63, 64, 65, 66, 67, 93], reverseItems: [67] },
  { code: "RES", items: [68, 69, 70, 71, 112], reverseItems: [71] },
  { code: "DES", items: [72, 73, 74, 75], reverseItems: [75] },
  { code: "ENG", items: [76, 77, 78, 79, 95], reverseItems: [79] },
  { code: "ROL", items: [96, 97, 98, 99, 103], reverseItems: [99] },
  { code: "DEM", items: [100, 101, 102, 111], reverseItems: [102] },
  { code: "APR", items: [104, 105, 106, 107], reverseItems: [107] },
];

// Attention checks: item 80 → expected 4, item 81 → expected 2 (sort order moved to 108-109 in v4.0)
const attentionChecks = [
  { itemNum: 80, expected: 4 },
  { itemNum: 81, expected: 2 },
];

// Module dimensions (only for campaign 2 which has CAM + DIG modules)
// Module item UUIDs use e5000000 prefix
const moduleDimensions = [
  { code: "CAM", items: [1, 2, 3, 4, 5, 6, 7, 8], reverseItems: [8] }, // Gestión del Cambio
  { code: "DIG", items: [13, 14, 15, 16], reverseItems: [16] }, // Preparación Digital
];

const moduleTargetAvg = {
  CAM: 3.7,
  DIG: 3.85,
};

function moduleItemUUID(n) {
  return `e5000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

function itemUUID(n) {
  return `e3000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

// Target dimension averages per campaign
// Q3 2025: baseline, LID/ORG strong, DES/CMP weak
// Q1 2026: overall improvement, some stagnant
const targetAvg = {
  0: {
    // Q3 2025
    ORG: 4.3,
    PRO: 4.25,
    SEG: 3.9,
    BAL: 3.7,
    CUI: 4.0,
    LID: 4.35,
    AUT: 4.1,
    COM: 3.8,
    CON: 3.75,
    CMP: 3.5,
    REC: 3.65,
    BEN: 3.55,
    EQA: 3.6,
    NDI: 4.4,
    COH: 4.15,
    INN: 3.85,
    RES: 4.05,
    DES: 3.55,
    ENG: 3.95,
    ROL: 4.0,
    DEM: 3.45,
    APR: 3.75,
  },
  1: {
    // Q1 2026
    ORG: 4.4,
    PRO: 4.35,
    SEG: 4.05,
    BAL: 3.85,
    CUI: 4.15,
    LID: 4.45,
    AUT: 4.2,
    COM: 3.95,
    CON: 3.9,
    CMP: 3.6,
    REC: 3.8,
    BEN: 3.65,
    EQA: 3.7,
    NDI: 4.5,
    COH: 4.25,
    INN: 4.0,
    RES: 4.15,
    DES: 3.7,
    ENG: 4.1,
    ROL: 4.15,
    DEM: 3.55,
    APR: 3.9,
  },
};

// Departments distribution
const departments = [
  "Ingeniería",
  "Marketing",
  "Operaciones",
  "Recursos Humanos",
  "Finanzas",
  "Ventas",
  "Soporte",
];
const deptWeights = [0.22, 0.14, 0.18, 0.1, 0.1, 0.16, 0.1];

// Tenure distribution
const tenures = ["<1", "1-3", "3-5", "5-10", "10+"];
const tenureWeights = [0.15, 0.25, 0.25, 0.2, 0.15];

// Gender distribution
const genders = ["Masculino", "Femenino", "No binario", "Prefiero no decir"];
const genderWeights = [0.48, 0.44, 0.04, 0.04];

function weightedPick(options, weights) {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < options.length; i++) {
    acc += weights[i];
    if (r < acc) return options[i];
  }
  return options[options.length - 1];
}

// eNPS distribution: ~25% promoters (9-10), ~45% passives (7-8), ~30% detractors (0-6)
function generateENPS() {
  const r = rng();
  if (r < 0.25) return 9 + Math.floor(rng() * 2); // 9 or 10
  if (r < 0.7) return 7 + Math.floor(rng() * 2); // 7 or 8
  return Math.floor(rng() * 7); // 0-6
}

// Generate a score given a target average
function generateScore(target, personality) {
  const noise = (rng() - 0.5) * 2.0;
  return clamp(target + personality + noise);
}

// SQL output
const lines = [];
function emit(sql) {
  lines.push(sql);
}

for (const campaign of campaigns) {
  const { id: campaignId, idx, respondentCount, date } = campaign;
  const avgs = targetAvg[idx];

  emit(`\n-- Campaign ${idx + 1}: ${respondentCount} respondentes`);

  // ~10% failure rate on attention checks
  const failSet = new Set();
  for (let i = 1; i <= respondentCount; i++) {
    if (rng() < 0.1) failSet.add(i);
  }

  // Generate respondents
  const respondentRows = [];
  for (let i = 1; i <= respondentCount; i++) {
    const uuid = respondentUUID(idx, i);
    const dept = weightedPick(departments, deptWeights);
    const tenure = weightedPick(tenures, tenureWeights);
    const gender = weightedPick(genders, genderWeights);
    const status = failSet.has(i) ? "disqualified" : "completed";
    const enps = generateENPS();
    const token = `demo${idx + 1}${String(i).padStart(4, "0")}`;
    const minute = String(15 + (i % 45)).padStart(2, "0");

    respondentRows.push(
      `('${uuid}', '${campaignId}', '${token}', '${dept}', '${tenure}', '${gender}', '${status}', '${date}T09:00:00Z', '${date}T09:${minute}:00Z', ${enps})`
    );
  }

  // Batch insert respondents
  for (let i = 0; i < respondentRows.length; i += 50) {
    const batch = respondentRows.slice(i, i + 50);
    emit(
      `INSERT INTO respondents (id, campaign_id, token, department, tenure, gender, status, started_at, completed_at, enps_score) VALUES`
    );
    emit(batch.join(",\n") + ";");
  }

  // Generate responses
  let responseNum = 0;
  const responseRows = [];

  for (let i = 1; i <= respondentCount; i++) {
    const rUUID = respondentUUID(idx, i);
    const personality = (rng() - 0.5) * 0.8;
    const minute = String(15 + (i % 45)).padStart(2, "0");

    for (const dim of dimensions) {
      const dimAvg = avgs[dim.code];
      for (const itemNum of dim.items) {
        responseNum++;
        const isReverse = dim.reverseItems.includes(itemNum);
        const targetForItem = isReverse ? 6 - dimAvg : dimAvg;
        const score = generateScore(targetForItem, personality);
        responseRows.push(
          `('${responseUUID(idx, responseNum)}', '${rUUID}', '${itemUUID(itemNum)}', ${score}, '${date}T09:${minute}:00Z')`
        );
      }
    }

    // Attention checks
    for (const ac of attentionChecks) {
      responseNum++;
      const score = failSet.has(i) ? (ac.expected === 4 ? 2 : 4) : ac.expected;
      responseRows.push(
        `('${responseUUID(idx, responseNum)}', '${rUUID}', '${itemUUID(ac.itemNum)}', ${score}, '${date}T09:${minute}:00Z')`
      );
    }

    // Module items (campaign 2 only — has CAM + DIG)
    if (idx === 1) {
      for (const mod of moduleDimensions) {
        const modAvg = moduleTargetAvg[mod.code];
        for (const itemNum of mod.items) {
          responseNum++;
          const isReverse = mod.reverseItems.includes(itemNum);
          const targetForItem = isReverse ? 6 - modAvg : modAvg;
          const score = generateScore(targetForItem, personality);
          responseRows.push(
            `('${responseUUID(idx, responseNum)}', '${rUUID}', '${moduleItemUUID(itemNum)}', ${score}, '${date}T09:${minute}:00Z')`
          );
        }
      }
    }
  }

  // Batch insert responses (100 per INSERT)
  for (let i = 0; i < responseRows.length; i += 100) {
    const batch = responseRows.slice(i, i + 100);
    emit(`INSERT INTO responses (id, respondent_id, item_id, score, answered_at) VALUES`);
    emit(batch.join(",\n") + ";");
  }

  // Open responses (15 per campaign)
  const openComments = [
    {
      type: "strength",
      text: "El liderazgo de mi supervisor es excepcional, siempre está disponible para apoyarnos.",
    },
    {
      type: "strength",
      text: "Me siento muy orgulloso de trabajar aquí, es una empresa con valores sólidos.",
    },
    {
      type: "strength",
      text: "La colaboración entre equipos es una de las mayores fortalezas de la organización.",
    },
    { type: "strength", text: "Valoro mucho la autonomía que me dan para realizar mi trabajo." },
    {
      type: "strength",
      text: "El ambiente laboral es muy positivo y los compañeros son solidarios.",
    },
    {
      type: "improvement",
      text: "La compensación debería ser más competitiva respecto al mercado.",
    },
    { type: "improvement", text: "Necesitamos más oportunidades de desarrollo y capacitación." },
    {
      type: "improvement",
      text: "La comunicación interna podría mejorar, a veces nos enteramos tarde de cambios importantes.",
    },
    { type: "improvement", text: "Los procesos de promoción no siempre son transparentes." },
    {
      type: "improvement",
      text: "Sería bueno tener más flexibilidad para el balance vida-trabajo.",
    },
    { type: "general", text: "En general estoy satisfecho con mi experiencia en la empresa." },
    { type: "general", text: "Creo que vamos por buen camino pero hay áreas claras de mejora." },
    { type: "general", text: "Me gustaría que se implementaran más iniciativas de bienestar." },
    { type: "general", text: "La empresa ha mejorado mucho en el último año." },
    {
      type: "general",
      text: "Espero que los resultados de esta encuesta se traduzcan en acciones concretas.",
    },
  ];

  const openRows = [];
  for (let j = 0; j < openComments.length; j++) {
    const c = openComments[j];
    // Pick a completed respondent
    let respIdx;
    do {
      respIdx = Math.floor(rng() * respondentCount) + 1;
    } while (failSet.has(respIdx));
    openRows.push(
      `('${openResponseUUID(idx, j + 1)}', '${respondentUUID(idx, respIdx)}', '${c.type}', '${c.text.replace(/'/g, "''")}')`
    );
  }

  emit(`INSERT INTO open_responses (id, respondent_id, question_type, text) VALUES`);
  emit(openRows.join(",\n") + ";");
}

console.log(lines.join("\n"));

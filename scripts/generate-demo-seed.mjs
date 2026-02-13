#!/usr/bin/env node
/**
 * Generate demo campaign seed SQL with 32 respondents and realistic responses.
 * Run: node scripts/generate-demo-seed.mjs > /tmp/demo-seed.sql
 */

// Item definitions: [itemId suffix, dimensionCode, isReverse, isAttentionCheck]
const items = [
  // LID - Liderazgo (5 items, 1 reverse)
  ["001", "LID", false, false],
  ["002", "LID", false, false],
  ["003", "LID", false, false],
  ["004", "LID", false, false],
  ["005", "LID", true, false],
  // JUS - Justicia (5 items, 1 reverse)
  ["006", "JUS", false, false],
  ["007", "JUS", false, false],
  ["008", "JUS", false, false],
  ["009", "JUS", false, false],
  ["010", "JUS", true, false],
  // PER - Pertenencia (4 items, 1 reverse)
  ["011", "PER", false, false],
  ["012", "PER", false, false],
  ["013", "PER", false, false],
  ["014", "PER", true, false],
  // Attention check 1
  ["015", null, false, true],
  // INN - Innovación (5 items, 1 reverse)
  ["016", "INN", false, false],
  ["017", "INN", false, false],
  ["018", "INN", false, false],
  ["019", "INN", false, false],
  ["020", "INN", true, false],
  // BIE - Bienestar (4 items, 1 reverse)
  ["021", "BIE", false, false],
  ["022", "BIE", false, false],
  ["023", "BIE", false, false],
  ["024", "BIE", true, false],
  // CLA - Claridad (4 items, 1 reverse)
  ["025", "CLA", false, false],
  ["026", "CLA", false, false],
  ["027", "CLA", false, false],
  ["028", "CLA", true, false],
  // Attention check 2
  ["029", null, false, true],
  // COM - Comunicación (4 items, 1 reverse)
  ["030", "COM", false, false],
  ["031", "COM", false, false],
  ["032", "COM", false, false],
  ["033", "COM", true, false],
  // ENG - Engagement (4 items, 1 reverse)
  ["034", "ENG", false, false],
  ["035", "ENG", false, false],
  ["036", "ENG", false, false],
  ["037", "ENG", true, false],
];

// Target adjusted averages per dimension
const targetAvg = {
  LID: 4.38,
  PER: 4.35,
  BIE: 3.62,
  JUS: 3.70,
  INN: 4.05,
  CLA: 4.10,
  COM: 3.95,
  ENG: 4.12,
};

// Respondent definitions
const respondents = [
  // Ingeniería (10)
  { idx: 1, dept: "Ingeniería", tenure: "1-3", gender: "male", enps: 9 },
  { idx: 2, dept: "Ingeniería", tenure: "3-5", gender: "female", enps: 8 },
  { idx: 3, dept: "Ingeniería", tenure: "<1", gender: "male", enps: 7 },
  { idx: 4, dept: "Ingeniería", tenure: "5-10", gender: "male", enps: 10 },
  { idx: 5, dept: "Ingeniería", tenure: "1-3", gender: "female", enps: 5 },
  { idx: 6, dept: "Ingeniería", tenure: "3-5", gender: "male", enps: 8 },
  { idx: 7, dept: "Ingeniería", tenure: "<1", gender: "non_binary", enps: 7 },
  { idx: 8, dept: "Ingeniería", tenure: "1-3", gender: "male", enps: 7 },
  { idx: 9, dept: "Ingeniería", tenure: "5-10", gender: "female", enps: 9 },
  { idx: 10, dept: "Ingeniería", tenure: "3-5", gender: "male", enps: 4 },
  // Marketing (5)
  { idx: 11, dept: "Marketing", tenure: "1-3", gender: "female", enps: 8 },
  { idx: 12, dept: "Marketing", tenure: "<1", gender: "male", enps: 7 },
  { idx: 13, dept: "Marketing", tenure: "3-5", gender: "female", enps: 10 },
  { idx: 14, dept: "Marketing", tenure: "1-3", gender: "female", enps: 3 },
  { idx: 15, dept: "Marketing", tenure: "5-10", gender: "male", enps: 8 },
  // Operaciones (8)
  { idx: 16, dept: "Operaciones", tenure: "1-3", gender: "male", enps: 6 },
  { idx: 17, dept: "Operaciones", tenure: "3-5", gender: "female", enps: 7 },
  { idx: 18, dept: "Operaciones", tenure: "<1", gender: "male", enps: 5 },
  { idx: 19, dept: "Operaciones", tenure: "10+", gender: "male", enps: 9 },
  { idx: 20, dept: "Operaciones", tenure: "1-3", gender: "female", enps: 8 },
  { idx: 21, dept: "Operaciones", tenure: "5-10", gender: "male", enps: 2 },
  { idx: 22, dept: "Operaciones", tenure: "3-5", gender: "female", enps: 7 },
  { idx: 23, dept: "Operaciones", tenure: "<1", gender: "male", enps: 6 },
  // Recursos Humanos (4)
  { idx: 24, dept: "Recursos Humanos", tenure: "3-5", gender: "female", enps: 9 },
  { idx: 25, dept: "Recursos Humanos", tenure: "1-3", gender: "female", enps: 8 },
  { idx: 26, dept: "Recursos Humanos", tenure: "5-10", gender: "male", enps: 10 },
  { idx: 27, dept: "Recursos Humanos", tenure: "10+", gender: "female", enps: 7 },
  // Finanzas (5)
  { idx: 28, dept: "Finanzas", tenure: "1-3", gender: "male", enps: 4 },
  { idx: 29, dept: "Finanzas", tenure: "3-5", gender: "female", enps: 7 },
  { idx: 30, dept: "Finanzas", tenure: "<1", gender: "male", enps: 9 },
  { idx: 31, dept: "Finanzas", tenure: "5-10", gender: "female", enps: 8 },
  { idx: 32, dept: "Finanzas", tenure: "1-3", gender: "male", enps: 3 },
];

// Simple seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

/**
 * Generate a score for a respondent+item that targets the dimension average.
 * For forward items: score targets the avg directly.
 * For reverse items: raw score targets (6 - avg) so adjusted = avg.
 */
function generateScore(dimCode, isReverse, respondentIdx) {
  const avg = targetAvg[dimCode];
  // Target raw score
  const rawTarget = isReverse ? 6 - avg : avg;

  // Add per-respondent personality bias (-0.5 to +0.5)
  const personalityBias = (((respondentIdx * 7 + 3) % 11) / 11 - 0.5) * 0.8;

  // Random noise
  const noise = (rng() - 0.5) * 2.0;

  const raw = rawTarget + personalityBias + noise;
  return Math.max(1, Math.min(5, Math.round(raw)));
}

function pad(n, len = 3) {
  return String(n).padStart(len, "0");
}

function respondentUuid(idx) {
  return `f0000000-0000-0000-0000-${pad(idx, 12).replace(/^0{6}/, "000000")}`;
}

function formatUuid(prefix, idx) {
  return `${prefix}-0000-0000-0000-${String(idx).padStart(12, "0")}`;
}

// --- Generate SQL ---
const lines = [];

lines.push(`
-- ============================================================
-- Seed: Demo Campaign with simulated responses
-- ============================================================

-- Create a demo campaign (closed, ready for calculateResults)
INSERT INTO campaigns (id, organization_id, instrument_id, name, status, starts_at, ends_at, population_n, sample_n, response_rate, margin_of_error, confidence_level)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Clima Q1 2026 - Demo',
  'closed',
  '2026-01-15T00:00:00Z',
  '2026-01-31T23:59:59Z',
  85, 32, 37.65, 14.23, 95.0
);

-- ============================================================
-- 32 Respondents with demographic data
-- ============================================================
INSERT INTO respondents (id, campaign_id, token, department, tenure, gender, status, enps_score, started_at, completed_at) VALUES`);

const respondentLines = respondents.map((r, i) => {
  const uuid = `f0000000-0000-0000-0000-${String(r.idx).padStart(12, "0")}`;
  const token = `demo${String(r.idx).padStart(4, "0")}`;
  const startH = 8 + (r.idx % 10);
  const startM = (r.idx * 7) % 60;
  const durationMin = 12 + (r.idx % 15);
  const started = `2026-01-${String(15 + (r.idx % 14)).padStart(2, "0")}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00Z`;
  const endH = startH + Math.floor((startM + durationMin) / 60);
  const endM = (startM + durationMin) % 60;
  const completed = `2026-01-${String(15 + (r.idx % 14)).padStart(2, "0")}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00Z`;
  const comma = i < respondents.length - 1 ? "," : ";";
  return `  ('${uuid}', 'e0000000-0000-0000-0000-000000000001', '${token}', '${r.dept}', '${r.tenure}', '${r.gender}', 'completed', ${r.enps}, '${started}', '${completed}')${comma}`;
});
lines.push(respondentLines.join("\n"));

// Generate responses
lines.push(`
-- ============================================================
-- Responses: 32 respondents × 37 items = 1,184 responses
-- ============================================================
INSERT INTO responses (respondent_id, item_id, score, answered_at) VALUES`);

const responseLines = [];
let responseCount = 0;

for (const r of respondents) {
  const respondentUuid = `f0000000-0000-0000-0000-${String(r.idx).padStart(12, "0")}`;
  const day = 15 + (r.idx % 14);

  for (const [itemSuffix, dimCode, isReverse, isAttnCheck] of items) {
    const itemUuid = `c1000002-0000-0000-0000-${String(parseInt(itemSuffix)).padStart(12, "0")}`;

    let score;
    if (isAttnCheck) {
      // Attention check 1 (item 015): "De acuerdo" = 4
      // Attention check 2 (item 029): "En desacuerdo" = 2
      score = itemSuffix === "015" ? 4 : 2;
    } else {
      score = generateScore(dimCode, isReverse, r.idx);
    }

    const minute = (parseInt(itemSuffix) * 2 + r.idx) % 60;
    const hour = 8 + Math.floor((parseInt(itemSuffix) * 2 + r.idx) / 60);
    const answeredAt = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;

    responseLines.push(`  ('${respondentUuid}', '${itemUuid}', ${score}, '${answeredAt}')`);
    responseCount++;
  }
}

// Join with commas and end with semicolon
lines.push(responseLines.join(",\n") + ";");

// Open responses
lines.push(`
-- ============================================================
-- Open responses (10 varied comments)
-- ============================================================
INSERT INTO open_responses (respondent_id, question_type, text) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'strength', 'El liderazgo de mi supervisor es excelente. Siempre está disponible para apoyarme y me da retroalimentación constructiva.'),
  ('f0000000-0000-0000-0000-000000000003', 'improvement', 'Sería bueno tener más flexibilidad en los horarios. A veces la carga de trabajo no permite un buen equilibrio.'),
  ('f0000000-0000-0000-0000-000000000005', 'general', 'Me gusta trabajar aquí pero creo que la comunicación entre departamentos podría mejorar bastante.'),
  ('f0000000-0000-0000-0000-000000000011', 'strength', 'El ambiente de trabajo y la relación con mis compañeros es lo mejor de esta empresa.'),
  ('f0000000-0000-0000-0000-000000000013', 'improvement', 'Los procesos de promoción no son transparentes. No queda claro qué criterios se usan para ascensos.'),
  ('f0000000-0000-0000-0000-000000000016', 'general', 'Necesitamos mejores herramientas tecnológicas. Algunas de las que usamos están desactualizadas.'),
  ('f0000000-0000-0000-0000-000000000019', 'strength', 'Llevo muchos años aquí y sigo comprometido. La estabilidad y el buen trato son clave.'),
  ('f0000000-0000-0000-0000-000000000024', 'improvement', 'La carga de trabajo ha aumentado mucho y no se han contratado más personas. Esto genera estrés.'),
  ('f0000000-0000-0000-0000-000000000028', 'general', 'Estaría bien tener más oportunidades de capacitación y desarrollo profesional.'),
  ('f0000000-0000-0000-0000-000000000031', 'strength', 'Me siento orgullosa de ser parte de esta organización. Los valores se viven día a día.');
`);

console.log(lines.join("\n"));

// Summary stats to stderr
const dimScores = {};
for (const r of respondents) {
  for (const [itemSuffix, dimCode, isReverse, isAttnCheck] of items) {
    if (isAttnCheck) continue;
    const score = generateScore(dimCode, isReverse, r.idx);
    const adjusted = isReverse ? 6 - score : score;
    if (!dimScores[dimCode]) dimScores[dimCode] = [];
    dimScores[dimCode].push(adjusted);
  }
}
// Re-seed the PRNG to get same scores
const rng2 = mulberry32(42);
// We need to re-run the same generation to get actual scores
// Actually let's just count from the generated data
process.stderr.write("\nDimension averages (approximate - re-generation may differ slightly):\n");
for (const [dim, target] of Object.entries(targetAvg)) {
  process.stderr.write(`  ${dim}: target=${target}\n`);
}
process.stderr.write(`\nTotal responses: ${responseCount}\n`);

// eNPS stats
const promoters = respondents.filter((r) => r.enps >= 9).length;
const passives = respondents.filter((r) => r.enps >= 7 && r.enps <= 8).length;
const detractors = respondents.filter((r) => r.enps <= 6).length;
const enps = Math.round(((promoters - detractors) / respondents.length) * 100);
process.stderr.write(`eNPS: promoters=${promoters}, passives=${passives}, detractors=${detractors}, eNPS=${enps}\n`);

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SurveyItem = {
  id: string;
  text: string;
  is_reverse: boolean;
  is_attention_check: boolean;
  sort_order: number;
};

type SurveyDimension = {
  id: string;
  code: string;
  name: string;
  items: SurveyItem[];
};

type Props = {
  token: string;
  respondentId: string;
  campaignId: string;
  organizationName: string;
  logoUrl: string | null;
  departments: string[];
  allowComments: boolean;
  dimensions: SurveyDimension[];
  existingResponses: { item_id: string; score: number }[];
  respondentStatus: string;
  respondentDemographics: {
    department: string | null;
    tenure: string | null;
    gender: string | null;
  };
};

const TENURE_OPTIONS = [
  { value: "<1", label: "Menos de 1 año" },
  { value: "1-3", label: "1-3 años" },
  { value: "3-5", label: "3-5 años" },
  { value: "5-10", label: "5-10 años" },
  { value: "10+", label: "Más de 10 años" },
];

const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
  { value: "prefer_not_to_say", label: "Prefiero no decir" },
];

const LIKERT_LABELS = [
  { value: 1, label: "Totalmente en desacuerdo" },
  { value: 2, label: "En desacuerdo" },
  { value: 3, label: "Ni acuerdo ni desacuerdo" },
  { value: 4, label: "De acuerdo" },
  { value: 5, label: "Totalmente de acuerdo" },
];

// ---------------------------------------------------------------------------
// localStorage backup — resilience against network/DB failures
// ---------------------------------------------------------------------------
const BACKUP_PREFIX = "climalab_survey_";

function getBackupKey(token: string) {
  return `${BACKUP_PREFIX}${token}`;
}

function saveBackup(token: string, data: { scores: Record<string, number> }) {
  try {
    localStorage.setItem(getBackupKey(token), JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function loadBackup(token: string): { scores: Record<string, number> } | null {
  try {
    const raw = localStorage.getItem(getBackupKey(token));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearBackup(token: string) {
  try {
    localStorage.removeItem(getBackupKey(token));
  } catch {
    // ignore
  }
}

async function retryAsync<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Shuffle helper (Fisher-Yates) with a seed for stability
// ---------------------------------------------------------------------------
function shuffleArray<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = (hash * 16807 + 11) % 2147483647;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Steps: welcome, demographics, dimension pages, open questions, thanks
// ---------------------------------------------------------------------------
type Step =
  | "welcome"
  | "demographics"
  | `dimension-${number}`
  | "open"
  | "thanks";

export function SurveyClient({
  token,
  respondentId,
  campaignId,
  organizationName,
  logoUrl,
  departments,
  allowComments,
  dimensions,
  existingResponses,
  respondentStatus,
  respondentDemographics,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  // Shuffle items within each dimension (stable by respondent token)
  const shuffledDimensions = useMemo(
    () =>
      dimensions.map((dim) => ({
        ...dim,
        items: shuffleArray(dim.items, `${token}-${dim.code}`),
      })),
    [dimensions, token]
  );

  // Recover state from existing responses + localStorage backup
  const initialScores = useMemo(() => {
    const map: Record<string, number> = {};
    // First load localStorage backup (lower priority)
    const backup = loadBackup(token);
    if (backup?.scores) {
      Object.assign(map, backup.scores);
    }
    // Then overlay DB responses (higher priority — already persisted)
    for (const r of existingResponses) {
      map[r.item_id] = r.score;
    }
    return map;
  }, [existingResponses, token]);

  // State
  const [step, setStep] = useState<Step>(
    respondentStatus === "in_progress" ? "demographics" : "welcome"
  );
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [department, setDepartment] = useState(
    respondentDemographics.department ?? ""
  );
  const [tenure, setTenure] = useState(
    respondentDemographics.tenure ?? ""
  );
  const [gender, setGender] = useState(
    respondentDemographics.gender ?? ""
  );
  const [openStrength, setOpenStrength] = useState("");
  const [openImprovement, setOpenImprovement] = useState("");
  const [openGeneral, setOpenGeneral] = useState("");
  const [enpsScore, setEnpsScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Persist scores to localStorage on every change
  useEffect(() => {
    if (Object.keys(scores).length > 0) {
      saveBackup(token, { scores });
    }
  }, [scores, token]);

  // Calculate progress
  const totalItems = shuffledDimensions.reduce(
    (acc, d) => acc + d.items.length,
    0
  );
  const answeredItems = Object.keys(scores).length;
  const progressPct = Math.round((answeredItems / totalItems) * 100);

  // On mount: flush any backup scores not yet in DB
  useEffect(() => {
    const backup = loadBackup(token);
    if (!backup?.scores) return;

    const dbItemIds = new Set(existingResponses.map((r) => r.item_id));
    const unsaved = Object.entries(backup.scores)
      .filter(([itemId]) => !dbItemIds.has(itemId))
      .map(([itemId, score]) => ({
        respondent_id: respondentId,
        item_id: itemId,
        score,
      }));

    if (unsaved.length === 0) return;

    console.log(`Recovering ${unsaved.length} responses from localStorage`);
    supabase
      .from("responses")
      .upsert(unsaved, { onConflict: "respondent_id,item_id" })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to recover backup responses:", error);
        } else {
          console.log("Backup responses recovered successfully");
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Figure out which dimension step we can resume to
  useEffect(() => {
    if (respondentStatus === "in_progress" && existingResponses.length > 0) {
      // Find the first incomplete dimension
      const answeredSet = new Set(existingResponses.map((r) => r.item_id));
      let resumeStep: Step = "demographics";

      if (respondentDemographics.department || respondentDemographics.tenure) {
        for (let i = 0; i < shuffledDimensions.length; i++) {
          const allAnswered = shuffledDimensions[i].items.every((item) =>
            answeredSet.has(item.id)
          );
          if (!allAnswered) {
            resumeStep = `dimension-${i}`;
            break;
          }
          if (i === shuffledDimensions.length - 1 && allAnswered) {
            resumeStep = "open";
          }
        }
      }

      setStep(resumeStep);
    }
  }, [respondentStatus, existingResponses, shuffledDimensions, respondentDemographics]);

  // Mark respondent as in_progress on start
  const markInProgress = useCallback(async () => {
    await supabase
      .from("respondents")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", respondentId);
  }, [supabase, respondentId]);

  // Save demographics
  const saveDemographics = useCallback(async () => {
    await supabase
      .from("respondents")
      .update({
        department: department || null,
        tenure: tenure || null,
        gender: gender || null,
      })
      .eq("id", respondentId);
  }, [supabase, respondentId, department, tenure, gender]);

  // Save dimension responses (upsert with retry)
  const saveDimensionResponses = useCallback(
    async (dimIndex: number) => {
      const dim = shuffledDimensions[dimIndex];
      const rows = dim.items
        .filter((item) => scores[item.id] !== undefined)
        .map((item) => ({
          respondent_id: respondentId,
          item_id: item.id,
          score: scores[item.id],
        }));

      if (rows.length === 0) return;

      await retryAsync(async () => {
        const { error } = await supabase.from("responses").upsert(rows, {
          onConflict: "respondent_id,item_id",
        });
        if (error) {
          console.error("Error saving responses (will retry):", error);
          throw new Error("No se pudieron guardar las respuestas");
        }
      });
    },
    [supabase, respondentId, shuffledDimensions, scores]
  );

  // Save open responses + eNPS
  const saveOpenResponses = useCallback(async () => {
    const rows: Array<{
      respondent_id: string;
      question_type: string;
      text: string;
    }> = [];

    if (openStrength.trim().length >= 3) {
      rows.push({
        respondent_id: respondentId,
        question_type: "strength",
        text: openStrength.trim(),
      });
    }
    if (openImprovement.trim().length >= 3) {
      rows.push({
        respondent_id: respondentId,
        question_type: "improvement",
        text: openImprovement.trim(),
      });
    }
    if (openGeneral.trim().length >= 3) {
      rows.push({
        respondent_id: respondentId,
        question_type: "general",
        text: openGeneral.trim(),
      });
    }

    if (rows.length > 0) {
      await supabase.from("open_responses").insert(rows);
    }

    // Save eNPS score
    if (enpsScore !== null) {
      await supabase
        .from("respondents")
        .update({ enps_score: enpsScore })
        .eq("id", respondentId);
    }
  }, [supabase, respondentId, openStrength, openImprovement, openGeneral, enpsScore]);

  // Complete survey
  const completeSurvey = useCallback(async () => {
    await supabase
      .from("respondents")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", respondentId);

    // Clear localStorage backup — everything is persisted in DB
    clearBackup(token);
  }, [supabase, respondentId, token]);

  // Navigation handlers
  const handleStart = async () => {
    await markInProgress();
    setStep("demographics");
  };

  const handleDemographicsNext = async () => {
    if (!department || !tenure) return;
    setSaving(true);
    await saveDemographics();
    setSaving(false);
    setStep("dimension-0");
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleDimensionNext = async (dimIndex: number) => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveDimensionResponses(dimIndex);
    } catch (err) {
      setSaving(false);
      setSaveError(
        err instanceof Error ? err.message : "Error guardando respuestas"
      );
      return;
    }
    setSaving(false);

    if (dimIndex < shuffledDimensions.length - 1) {
      setStep(`dimension-${dimIndex + 1}`);
    } else {
      setStep(allowComments ? "open" : "thanks");
      if (!allowComments) {
        await completeSurvey();
      }
    }
  };

  const handleDimensionBack = (dimIndex: number) => {
    if (dimIndex === 0) {
      setStep("demographics");
    } else {
      setStep(`dimension-${dimIndex - 1}`);
    }
  };

  const handleOpenNext = async () => {
    setSaving(true);
    await saveOpenResponses();
    await completeSurvey();
    setSaving(false);
    setStep("thanks");
  };

  // Check if all items in a dimension are answered
  const isDimensionComplete = (dimIndex: number) => {
    return shuffledDimensions[dimIndex].items.every(
      (item) => scores[item.id] !== undefined
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Progress bar (only show during questions)
  const showProgress =
    step !== "welcome" && step !== "thanks" && step !== "demographics";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress bar */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 text-center py-1">
            {progressPct}% completado
          </div>
        </div>
      )}

      <div
        className={`max-w-2xl mx-auto px-4 py-8 ${showProgress ? "pt-14" : ""}`}
      >
        {/* WELCOME */}
        {step === "welcome" && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={organizationName}
                className="h-16 object-contain"
              />
            )}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Encuesta de Clima Organizacional
              </h1>
              {organizationName && (
                <p className="text-lg text-gray-600">{organizationName}</p>
              )}
            </div>
            <p className="text-gray-600 max-w-md">
              Tu opinión es importante para construir un mejor lugar de trabajo.
              Esta encuesta es completamente anónima y tomará aproximadamente
              8-10 minutos.
            </p>
            <Button size="lg" onClick={handleStart}>
              Comenzar
            </Button>
          </div>
        )}

        {/* DEMOGRAPHICS */}
        {step === "demographics" && (
          <Card>
            <CardHeader>
              <CardTitle>Datos demográficos</CardTitle>
              <p className="text-sm text-gray-500">
                Esta información se usa únicamente para análisis agregado y no
                permite identificarte.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Department */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Departamento <span className="text-red-500">*</span>
                </label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tenure */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Antigüedad <span className="text-red-500">*</span>
                </label>
                <Select value={tenure} onValueChange={setTenure}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu antigüedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {TENURE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gender (optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Género{" "}
                  <span className="text-gray-400 text-xs">(opcional)</span>
                </label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu género" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleDemographicsNext}
                disabled={!department || !tenure || saving}
              >
                {saving ? "Guardando..." : "Continuar"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* DIMENSION QUESTIONS */}
        {step.startsWith("dimension-") && (() => {
          const dimIndex = parseInt(step.split("-")[1]);
          const dim = shuffledDimensions[dimIndex];

          return (
            <div className="space-y-6">
              <div className="text-sm text-gray-500">
                Sección {dimIndex + 1} de {shuffledDimensions.length}
              </div>

              {dim.items.map((item, itemIdx) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <p className="text-base font-medium mb-4">
                      {itemIdx + 1}. {item.text}
                    </p>
                    <div className="grid grid-cols-5 gap-1 sm:gap-2">
                      {LIKERT_LABELS.map((likert) => (
                        <button
                          key={likert.value}
                          onClick={() =>
                            setScores((prev) => ({
                              ...prev,
                              [item.id]: likert.value,
                            }))
                          }
                          className={`flex flex-col items-center justify-center rounded-lg border-2 p-2 sm:p-3 transition-colors text-xs sm:text-sm ${
                            scores[item.id] === likert.value
                              ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                              : "border-gray-200 hover:border-gray-300 text-gray-600"
                          }`}
                        >
                          <span className="text-lg font-bold mb-1">
                            {likert.value}
                          </span>
                          <span className="text-[10px] sm:text-xs leading-tight text-center">
                            {likert.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {saveError} — Intenta de nuevo.
                </div>
              )}

              <div className="flex justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleDimensionBack(dimIndex)}
                >
                  Atrás
                </Button>
                <Button
                  onClick={() => handleDimensionNext(dimIndex)}
                  disabled={!isDimensionComplete(dimIndex) || saving}
                >
                  {saving
                    ? "Guardando..."
                    : dimIndex < shuffledDimensions.length - 1
                      ? "Siguiente"
                      : allowComments
                        ? "Siguiente"
                        : "Finalizar"}
                </Button>
              </div>
            </div>
          );
        })()}

        {/* OPEN QUESTIONS + eNPS */}
        {step === "open" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>eNPS</CardTitle>
                <p className="text-sm text-gray-500">
                  ¿Qué tan probable es que recomiendes esta organización como un
                  buen lugar para trabajar?
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: 11 }, (_, i) => i).map((val) => (
                    <button
                      key={val}
                      onClick={() => setEnpsScore(val)}
                      className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-colors ${
                        enpsScore === val
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      {val}
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    ¿Qué es lo mejor de trabajar aquí?
                  </label>
                  <textarea
                    value={openStrength}
                    onChange={(e) => setOpenStrength(e.target.value)}
                    className="w-full min-h-[80px] rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    placeholder="Escribe tu respuesta..."
                    maxLength={2000}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Si pudieras cambiar una cosa de esta organización, ¿cuál
                    sería?
                  </label>
                  <textarea
                    value={openImprovement}
                    onChange={(e) => setOpenImprovement(e.target.value)}
                    className="w-full min-h-[80px] rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    placeholder="Escribe tu respuesta..."
                    maxLength={2000}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    ¿Hay algo más que quieras compartir?{" "}
                    <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <textarea
                    value={openGeneral}
                    onChange={(e) => setOpenGeneral(e.target.value)}
                    className="w-full min-h-[80px] rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    placeholder="Escribe tu respuesta..."
                    maxLength={2000}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={() =>
                  setStep(`dimension-${shuffledDimensions.length - 1}`)
                }
              >
                Atrás
              </Button>
              <Button onClick={handleOpenNext} disabled={saving}>
                {saving ? "Guardando..." : "Finalizar encuesta"}
              </Button>
            </div>
          </div>
        )}

        {/* THANKS */}
        {step === "thanks" && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              ¡Gracias por tu participación!
            </h1>
            <p className="text-gray-600 max-w-md">
              Tus respuestas han sido registradas de forma anónima. Tu opinión
              contribuye a mejorar el ambiente de trabajo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearBackup,
  loadBackup,
  retryAsync,
  saveBackup,
} from "@/app/survey/[token]/survey-backup";
import {
  buildInitialScores,
  isDimensionComplete,
  resolveResumeStep,
  shuffleArray,
} from "@/app/survey/[token]/survey-helpers";
import type {
  SurveyClientProps,
  SurveyDimension,
  SurveyStep,
} from "@/app/survey/[token]/survey-types";

export function useSurveySession({
  token,
  dimensions,
  existingResponses,
  respondentStatus,
  respondentDemographics,
  allowComments,
}: Pick<
  SurveyClientProps,
  | "token"
  | "dimensions"
  | "existingResponses"
  | "respondentStatus"
  | "respondentDemographics"
  | "allowComments"
>) {
  const postSurvey = useCallback(
    async (path: string, body?: unknown) => {
      const response = await fetch(`/api/survey/${token}/${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "La operación de encuesta falló");
      }
    },
    [token]
  );

  const shuffledDimensions = useMemo<SurveyDimension[]>(
    () =>
      dimensions.map((dimension) => ({
        ...dimension,
        items: shuffleArray(dimension.items, `${token}-${dimension.code}`),
      })),
    [dimensions, token]
  );

  const initialScores = useMemo(
    () => buildInitialScores(token, existingResponses),
    [existingResponses, token]
  );

  const [step, setStep] = useState<SurveyStep>(
    respondentStatus === "in_progress" ? "demographics" : "welcome"
  );
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [department, setDepartment] = useState(respondentDemographics.department ?? "");
  const [tenure, setTenure] = useState(respondentDemographics.tenure ?? "");
  const [gender, setGender] = useState(respondentDemographics.gender ?? "");
  const [openStrength, setOpenStrength] = useState("");
  const [openImprovement, setOpenImprovement] = useState("");
  const [openGeneral, setOpenGeneral] = useState("");
  const [enpsScore, setEnpsScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (Object.keys(scores).length > 0) {
      saveBackup(token, { scores });
    }
  }, [scores, token]);

  const totalItems = shuffledDimensions.reduce(
    (count, dimension) => count + dimension.items.length,
    0
  );
  const answeredItems = Object.keys(scores).length;
  const progressPct = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;
  const showProgress = step !== "welcome" && step !== "thanks" && step !== "demographics";

  useEffect(() => {
    const backup = loadBackup(token);
    if (!backup?.scores) return;

    const dbItemIds = new Set(existingResponses.map((response) => response.item_id));
    const unsaved = Object.entries(backup.scores)
      .filter(([itemId]) => !dbItemIds.has(itemId))
      .map(([itemId, score]) => ({
        itemId,
        score,
      }));

    if (unsaved.length === 0) return;

    postSurvey("responses", { items: unsaved }).catch((error) => {
      console.error("Failed to recover backup responses:", error);
    });
  }, [existingResponses, postSurvey, token]);

  useEffect(() => {
    setStep(
      resolveResumeStep({
        respondentStatus,
        respondentDemographics,
        existingResponses,
        shuffledDimensions,
      })
    );
  }, [existingResponses, respondentDemographics, respondentStatus, shuffledDimensions]);

  const markInProgress = useCallback(async () => {
    await postSurvey("start");
  }, [postSurvey]);

  const saveDemographics = useCallback(async () => {
    await postSurvey("demographics", {
      department,
      tenure,
      gender: gender || null,
    });
  }, [department, gender, postSurvey, tenure]);

  const saveDimensionResponses = useCallback(
    async (dimensionIndex: number) => {
      const dimension = shuffledDimensions[dimensionIndex];
      const rows = dimension.items
        .filter((item) => scores[item.id] !== undefined)
        .map((item) => ({
          itemId: item.id,
          score: scores[item.id],
        }));

      if (rows.length === 0) return;

      await retryAsync(async () => {
        await postSurvey("responses", { items: rows });
      });
    },
    [postSurvey, scores, shuffledDimensions]
  );

  const saveOpenResponses = useCallback(async () => {
    const openResponses: Array<{
      questionType: "strength" | "improvement" | "general";
      text: string;
    }> = [];

    if (openStrength.trim().length >= 3) {
      openResponses.push({ questionType: "strength", text: openStrength.trim() });
    }
    if (openImprovement.trim().length >= 3) {
      openResponses.push({ questionType: "improvement", text: openImprovement.trim() });
    }
    if (openGeneral.trim().length >= 3) {
      openResponses.push({ questionType: "general", text: openGeneral.trim() });
    }

    await postSurvey("complete", { enpsScore, openResponses });
  }, [enpsScore, openGeneral, openImprovement, openStrength, postSurvey]);

  const completeSurvey = useCallback(async () => {
    clearBackup(token);
  }, [token]);

  const handleStart = useCallback(async () => {
    await markInProgress();
    setStep("demographics");
  }, [markInProgress]);

  const handleDemographicsNext = useCallback(async () => {
    if (!department || !tenure) return;
    setSaving(true);
    await saveDemographics();
    setSaving(false);
    setStep("dimension-0");
  }, [department, saveDemographics, tenure]);

  const handleDimensionNext = useCallback(
    async (dimensionIndex: number) => {
      setSaving(true);
      setSaveError(null);

      try {
        await saveDimensionResponses(dimensionIndex);
      } catch (error) {
        setSaving(false);
        setSaveError(error instanceof Error ? error.message : "Error guardando respuestas");
        return;
      }

      setSaving(false);

      if (dimensionIndex < shuffledDimensions.length - 1) {
        setStep(`dimension-${dimensionIndex + 1}`);
        return;
      }

      setStep(allowComments ? "open" : "thanks");
      if (!allowComments) {
        await postSurvey("complete", { enpsScore: null, openResponses: [] });
        await completeSurvey();
      }
    },
    [allowComments, completeSurvey, postSurvey, saveDimensionResponses, shuffledDimensions.length]
  );

  const handleDimensionBack = useCallback((dimensionIndex: number) => {
    setStep(dimensionIndex === 0 ? "demographics" : `dimension-${dimensionIndex - 1}`);
  }, []);

  const handleOpenNext = useCallback(async () => {
    setSaving(true);
    try {
      await saveOpenResponses();
      await completeSurvey();
      setStep("thanks");
    } finally {
      setSaving(false);
    }
  }, [completeSurvey, saveOpenResponses]);

  return {
    step,
    setStep,
    shuffledDimensions,
    scores,
    setScores,
    department,
    setDepartment,
    tenure,
    setTenure,
    gender,
    setGender,
    openStrength,
    setOpenStrength,
    openImprovement,
    setOpenImprovement,
    openGeneral,
    setOpenGeneral,
    enpsScore,
    setEnpsScore,
    saving,
    saveError,
    progressPct,
    showProgress,
    handleStart,
    handleDemographicsNext,
    handleDimensionNext,
    handleDimensionBack,
    handleOpenNext,
    isDimensionComplete: (dimensionIndex: number) =>
      isDimensionComplete(shuffledDimensions, dimensionIndex, scores),
  };
}

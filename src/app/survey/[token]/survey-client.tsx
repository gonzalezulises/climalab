"use client";

import { useMemo } from "react";
import { DEFAULT_BRAND_CONFIG } from "@/lib/constants";
import {
  DemographicsStep,
  DimensionStep,
  OpenQuestionsStep,
  SurveyProgressBar,
  ThanksStep,
  WelcomeStep,
} from "@/app/survey/[token]/survey-step-components";
import { useSurveySession } from "@/app/survey/[token]/use-survey-session";
import type { SurveyClientProps } from "@/app/survey/[token]/survey-types";

export function SurveyClient({
  token,
  organizationName,
  logoUrl,
  brandConfig: rawBrandConfig,
  departments,
  allowComments,
  dimensions,
  existingResponses,
  respondentStatus,
  respondentDemographics,
}: SurveyClientProps) {
  const brand = useMemo(() => ({ ...DEFAULT_BRAND_CONFIG, ...rawBrandConfig }), [rawBrandConfig]);
  const session = useSurveySession({
    token,
    dimensions,
    existingResponses,
    respondentStatus,
    respondentDemographics,
    allowComments,
  });

  const dimensionIndex = session.step.startsWith("dimension-")
    ? Number.parseInt(session.step.split("-")[1], 10)
    : null;
  const currentDimension =
    dimensionIndex != null ? session.shuffledDimensions[dimensionIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {session.showProgress && (
        <SurveyProgressBar
          progressPct={session.progressPct}
          primaryColor={brand.primary_color as string}
        />
      )}

      <div className={`max-w-2xl mx-auto px-4 py-8 ${session.showProgress ? "pt-14" : ""}`}>
        {session.step === "welcome" && (
          <WelcomeStep
            logoUrl={logoUrl}
            organizationName={organizationName}
            brand={brand}
            onStart={session.handleStart}
          />
        )}

        {session.step === "demographics" && (
          <DemographicsStep
            departments={departments}
            department={session.department}
            tenure={session.tenure}
            gender={session.gender}
            saving={session.saving}
            preAssignedDepartment={!!respondentDemographics.department}
            onDepartmentChange={session.setDepartment}
            onTenureChange={session.setTenure}
            onGenderChange={session.setGender}
            onNext={session.handleDemographicsNext}
          />
        )}

        {dimensionIndex != null && currentDimension && (
          <DimensionStep
            dimensionIndex={dimensionIndex}
            totalDimensions={session.shuffledDimensions.length}
            dimension={currentDimension}
            scores={session.scores}
            primaryColor={brand.primary_color as string}
            saving={session.saving}
            saveError={session.saveError}
            onScoreChange={(itemId, score) =>
              session.setScores((previous) => ({ ...previous, [itemId]: score }))
            }
            onBack={() => session.handleDimensionBack(dimensionIndex)}
            onNext={() => session.handleDimensionNext(dimensionIndex)}
            canContinue={session.isDimensionComplete(dimensionIndex)}
            allowComments={allowComments}
          />
        )}

        {session.step === "open" && (
          <OpenQuestionsStep
            primaryColor={brand.primary_color as string}
            saving={session.saving}
            totalDimensions={session.shuffledDimensions.length}
            enpsScore={session.enpsScore}
            openStrength={session.openStrength}
            openImprovement={session.openImprovement}
            openGeneral={session.openGeneral}
            onEnpsChange={session.setEnpsScore}
            onOpenStrengthChange={session.setOpenStrength}
            onOpenImprovementChange={session.setOpenImprovement}
            onOpenGeneralChange={session.setOpenGeneral}
            onBack={() => session.setStep(`dimension-${session.shuffledDimensions.length - 1}`)}
            onNext={session.handleOpenNext}
          />
        )}

        {session.step === "thanks" && <ThanksStep brand={brand} />}
      </div>
    </div>
  );
}

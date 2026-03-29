export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function roundPercentage(value: number) {
  return Math.round(value * 10) / 10;
}

export function computeResponseRate(sampleN: number, populationN: number) {
  if (populationN <= 0) {
    return 0;
  }

  return Math.round((sampleN / populationN) * 10000) / 100;
}

export function computeMarginOfError(sampleN: number, populationN: number) {
  if (sampleN <= 0 || populationN <= 1) {
    return 0;
  }

  const fpcCorrection = Math.sqrt((populationN - sampleN) / (populationN - 1));
  return Math.round(1.96 * Math.sqrt(0.25 / sampleN) * fpcCorrection * 100 * 100) / 100;
}

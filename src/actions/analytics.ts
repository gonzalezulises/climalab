"use server";

import {
  getAlerts as loadAlerts,
  getCategoryScores as loadCategoryScores,
  getCorrelationMatrix as loadCorrelationMatrix,
  getEngagementDrivers as loadEngagementDrivers,
  getReliabilityData as loadReliabilityData,
  hasONAData as loadHasONAData,
} from "@/lib/analytics/analysis-store";
import {
  getAvailableSegments as loadAvailableSegments,
  getBenchmarkData as loadBenchmarkData,
  getHeatmapData as loadHeatmapData,
} from "@/lib/analytics/benchmarks";
import {
  getTrendsData as loadTrendsData,
  getWaveComparison as loadWaveComparison,
} from "@/lib/analytics/trends";

export async function hasONAData(campaignId: string) {
  return loadHasONAData(campaignId);
}

export async function getAvailableSegments(campaignId: string) {
  return loadAvailableSegments(campaignId);
}

export async function getCorrelationMatrix(campaignId: string) {
  return loadCorrelationMatrix(campaignId);
}

export async function getEngagementDrivers(campaignId: string) {
  return loadEngagementDrivers(campaignId);
}

export async function getAlerts(campaignId: string) {
  return loadAlerts(campaignId);
}

export async function getCategoryScores(campaignId: string) {
  return loadCategoryScores(campaignId);
}

export async function getReliabilityData(campaignId: string) {
  return loadReliabilityData(campaignId);
}

export async function getHeatmapData(campaignId: string) {
  return loadHeatmapData(campaignId);
}

export async function getBenchmarkData(campaignId: string) {
  return loadBenchmarkData(campaignId);
}

export async function getWaveComparison(organizationId: string) {
  return loadWaveComparison(organizationId);
}

export async function getTrendsData(organizationId: string) {
  return loadTrendsData(organizationId);
}

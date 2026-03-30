import type { CampaignAiInsightType, InsightContract } from "@/lib/ai/contracts";
import { getInsightContract } from "@/lib/ai/contracts";
import { ALERTS_SYSTEM } from "@/lib/ai/prompts/alerts";
import { COMMENTS_SYSTEM } from "@/lib/ai/prompts/comments";
import { NARRATIVE_SYSTEM } from "@/lib/ai/prompts/dashboard";
import { DRIVERS_SYSTEM } from "@/lib/ai/prompts/drivers";
import { SEGMENTS_SYSTEM } from "@/lib/ai/prompts/segments";
import { TRENDS_SYSTEM } from "@/lib/ai/prompts/trends";

type PromptRegistryEntry<TInsightType extends CampaignAiInsightType = CampaignAiInsightType> = {
  insightType: TInsightType;
  contract: InsightContract<TInsightType>;
  systemPrompt: string;
  outputContractSummary: string;
  active: true;
};

const REGISTRY: { [K in CampaignAiInsightType]: PromptRegistryEntry<K> } = {
  comment_analysis: {
    insightType: "comment_analysis",
    contract: getInsightContract("comment_analysis"),
    systemPrompt: COMMENTS_SYSTEM,
    outputContractSummary:
      "themes[], summary{strengths,improvements,general}, sentiment_distribution",
    active: true,
  },
  dashboard_narrative: {
    insightType: "dashboard_narrative",
    contract: getInsightContract("dashboard_narrative"),
    systemPrompt: NARRATIVE_SYSTEM,
    outputContractSummary: "executive_summary, highlights[], concerns[], recommendation",
    active: true,
  },
  driver_insights: {
    insightType: "driver_insights",
    contract: getInsightContract("driver_insights"),
    systemPrompt: DRIVERS_SYSTEM,
    outputContractSummary: "narrative, paradoxes[], quick_wins[]",
    active: true,
  },
  alert_context: {
    insightType: "alert_context",
    contract: getInsightContract("alert_context"),
    systemPrompt: ALERTS_SYSTEM,
    outputContractSummary: "array of {alert_index, root_cause, recommendation}",
    active: true,
  },
  segment_profiles: {
    insightType: "segment_profiles",
    contract: getInsightContract("segment_profiles"),
    systemPrompt: SEGMENTS_SYSTEM,
    outputContractSummary: "array of {segment, segment_type, narrative, strengths[], risks[]}",
    active: true,
  },
  trends_narrative: {
    insightType: "trends_narrative",
    contract: getInsightContract("trends_narrative"),
    systemPrompt: TRENDS_SYSTEM,
    outputContractSummary: "trajectory, improving[], declining[], stable[], inflection_points[]",
    active: true,
  },
};

export function getAiPromptRegistryEntry<TInsightType extends CampaignAiInsightType>(
  insightType: TInsightType
) {
  return REGISTRY[insightType];
}

export function listAiPromptRegistryEntries() {
  return Object.values(REGISTRY);
}

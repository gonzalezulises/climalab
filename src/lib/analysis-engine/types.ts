import type { Json } from "@/types/database";

export type CampaignInstrumentRef = {
  instrumentId: string;
  instrumentType: "base" | "module";
  sortOrder: number;
};

export type AnalysisItem = {
  id: string;
  text: string;
  isReverse: boolean;
  isAttentionCheck: boolean;
};

export type AnalysisDimension = {
  id: string;
  instrumentId: string;
  instrumentType: "base" | "module";
  code: string;
  name: string;
  category: string | null;
  analyticsCategory: string | null;
  items: AnalysisItem[];
};

export type AnalysisRespondent = {
  id: string;
  department: string | null;
  tenure: string | null;
  gender: string | null;
  enpsScore: number | null;
};

export type AnalysisResponse = {
  respondentId: string;
  itemId: string;
  score: number;
  answeredAt?: string | null;
};

export type AnalysisDataset = {
  campaignId: string;
  targetPopulation: number;
  campaignInstruments: CampaignInstrumentRef[];
  dimensions: AnalysisDimension[];
  respondents: AnalysisRespondent[];
  responses: AnalysisResponse[];
};

export type AnalysisRunTriggerSource =
  | "cron"
  | "manual"
  | "batch"
  | "seed"
  | "incremental_refresh"
  | "response_hook";

export type RespondentQualityRecord = {
  respondentId: string;
  status: "valid" | "disqualified";
  reason: "attention_check_failed" | null;
};

export type AnalysisResultRow = {
  campaign_id: string;
  analysis_run_id?: string | null;
  result_type: string;
  instrument_id?: string | null;
  instrument_type?: "base" | "module" | null;
  dimension_id?: string | null;
  dimension_code: string | null;
  segment_key: string;
  segment_type: string;
  avg_score: number;
  std_score: number;
  favorability_pct: number;
  response_count: number;
  respondent_count: number;
  metadata: Json;
};

export type AnalysisAnalyticsRow = {
  campaign_id: string;
  analysis_run_id?: string | null;
  analysis_type: string;
  data: Json;
};

export type ScoredCampaignOutput = {
  populationN: number;
  sampleN: number;
  responseRate: number;
  marginOfError: number;
  validRespondentIds: string[];
  respondentQuality: RespondentQualityRecord[];
  results: AnalysisResultRow[];
  analytics: AnalysisAnalyticsRow[];
};

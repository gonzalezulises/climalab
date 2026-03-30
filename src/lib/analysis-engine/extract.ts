import type { AnalysisDataset, AnalysisDimension, CampaignInstrumentRef } from "./types";

type QueryClient = {
  from: (table: string) => {
    select: (query: string) => unknown;
  };
};

type CampaignRecord = {
  id: string;
  instrument_id: string;
  module_instrument_ids?: string[] | null;
  target_population?: number | null;
  organizations?: {
    employee_count?: number | null;
  } | null;
  campaign_instruments?: Array<{
    instrument_id: string;
    instrument_type: "base" | "module";
    sort_order: number;
  }> | null;
};

type DimensionRecord = {
  id: string;
  instrument_id: string;
  code: string;
  name: string;
  category: string | null;
  items: Array<{
    id: string;
    text: string;
    is_reverse: boolean;
    is_attention_check: boolean;
  }>;
  dimension_taxonomy?: Array<{ analytics_category: string | null }> | null;
};

type RespondentRecord = {
  id: string;
  department: string | null;
  tenure: string | null;
  gender: string | null;
  enps_score: number | null;
};

type ResponseRecord = {
  respondent_id: string;
  item_id: string;
  score: number;
  answered_at: string | null;
};

const RESPONSE_PAGE_SIZE = 1000;

export function buildCampaignInstrumentRefs(campaign: CampaignRecord): CampaignInstrumentRef[] {
  if (campaign.campaign_instruments && campaign.campaign_instruments.length > 0) {
    return [...campaign.campaign_instruments]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((entry) => ({
        instrumentId: entry.instrument_id,
        instrumentType: entry.instrument_type,
        sortOrder: entry.sort_order,
      }));
  }

  return [
    { instrumentId: campaign.instrument_id, instrumentType: "base", sortOrder: 0 },
    ...(campaign.module_instrument_ids ?? []).map((instrumentId, index) => ({
      instrumentId,
      instrumentType: "module" as const,
      sortOrder: index + 1,
    })),
  ];
}

export async function loadCampaignAnalysisDataset(
  reader: QueryClient,
  campaignId: string
): Promise<AnalysisDataset> {
  const campaignQuery = reader
    .from("campaigns")
    .select(
      "id, instrument_id, module_instrument_ids, target_population, organizations(employee_count), campaign_instruments(instrument_id, instrument_type, sort_order)"
    ) as {
    eq: (
      column: string,
      value: string
    ) => {
      single: () => Promise<{
        data: CampaignRecord | null;
        error: { message: string } | null;
      }>;
    };
  };

  const { data: campaignData, error: campaignError } = (await campaignQuery
    .eq("id", campaignId)
    .single()) as {
    data: CampaignRecord | null;
    error: { message: string } | null;
  };

  if (campaignError || !campaignData) {
    throw new Error(campaignError?.message ?? "Campaña no encontrada");
  }

  const campaign = campaignData as CampaignRecord;
  const campaignInstruments = buildCampaignInstrumentRefs(campaign);
  const instrumentIds = campaignInstruments.map((entry) => entry.instrumentId);

  const dimensionsQuery = reader
    .from("dimensions")
    .select(
      "id, instrument_id, code, name, category, items(id, text, is_reverse, is_attention_check), dimension_taxonomy(analytics_category)"
    ) as {
    in: (
      column: string,
      values: string[]
    ) => {
      order: (
        column: string,
        options?: { ascending?: boolean }
      ) => Promise<{
        data: DimensionRecord[] | null;
        error: { message: string } | null;
      }>;
    };
  };

  const { data: dimensionsData, error: dimensionsError } = (await dimensionsQuery
    .in("instrument_id", instrumentIds)
    .order("sort_order", { ascending: true })) as {
    data: DimensionRecord[] | null;
    error: { message: string } | null;
  };

  if (dimensionsError || !dimensionsData) {
    throw new Error(dimensionsError?.message ?? "No se pudieron cargar las dimensiones");
  }

  const instrumentTypeById = new Map(
    campaignInstruments.map((entry) => [entry.instrumentId, entry.instrumentType])
  );

  const dimensions = (dimensionsData as DimensionRecord[]).map<AnalysisDimension>((dimension) => ({
    id: dimension.id,
    instrumentId: dimension.instrument_id,
    instrumentType: instrumentTypeById.get(dimension.instrument_id) ?? "base",
    code: dimension.code,
    name: dimension.name,
    category: dimension.category,
    analyticsCategory: dimension.dimension_taxonomy?.[0]?.analytics_category ?? null,
    items: dimension.items.map((item) => ({
      id: item.id,
      text: item.text,
      isReverse: item.is_reverse,
      isAttentionCheck: item.is_attention_check,
    })),
  }));

  const respondentsQuery = reader
    .from("respondents")
    .select("id, department, tenure, gender, enps_score") as {
    eq: (
      column: string,
      value: string
    ) => {
      eq: (
        column: string,
        value: string
      ) => Promise<{
        data: RespondentRecord[] | null;
        error: { message: string } | null;
      }>;
    };
  };

  const { data: respondentsData, error: respondentsError } = (await respondentsQuery
    .eq("campaign_id", campaignId)
    .eq("status", "completed")) as {
    data: RespondentRecord[] | null;
    error: { message: string } | null;
  };

  if (respondentsError) {
    throw new Error(respondentsError.message);
  }

  const respondents = (respondentsData ?? []) as RespondentRecord[];
  const respondentIds = respondents.map((respondent) => respondent.id);

  const responses =
    respondentIds.length > 0 ? await loadCampaignResponses(reader, respondentIds) : [];

  return {
    campaignId,
    targetPopulation: campaign.target_population ?? campaign.organizations?.employee_count ?? 0,
    campaignInstruments,
    dimensions,
    respondents: respondents.map((respondent) => ({
      id: respondent.id,
      department: respondent.department,
      tenure: respondent.tenure,
      gender: respondent.gender,
      enpsScore: respondent.enps_score,
    })),
    responses: responses.map((response) => ({
      respondentId: response.respondent_id,
      itemId: response.item_id,
      score: response.score,
      answeredAt: response.answered_at,
    })),
  };
}

async function loadCampaignResponses(reader: QueryClient, respondentIds: string[]) {
  const responses: ResponseRecord[] = [];
  let from = 0;

  while (true) {
    // Campaigns with many respondents can easily exceed the PostgREST page cap.
    const responsesQuery = reader
      .from("responses")
      .select("respondent_id, item_id, score, answered_at") as {
      in: (
        column: string,
        values: string[]
      ) => {
        order: (
          column: string,
          options?: { ascending?: boolean }
        ) => {
          order: (
            column: string,
            options?: { ascending?: boolean }
          ) => {
            range: (
              from: number,
              to: number
            ) => Promise<{
              data: ResponseRecord[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };

    const { data: pageData, error: responsesError } = (await responsesQuery
      .in("respondent_id", respondentIds)
      .order("respondent_id", { ascending: true })
      .order("item_id", { ascending: true })
      .range(from, from + RESPONSE_PAGE_SIZE - 1)) as {
      data: ResponseRecord[] | null;
      error: { message: string } | null;
    };

    if (responsesError) {
      throw new Error(responsesError.message);
    }

    const page = (pageData ?? []) as ResponseRecord[];
    responses.push(...page);

    if (page.length < RESPONSE_PAGE_SIZE) {
      break;
    }

    from += RESPONSE_PAGE_SIZE;
  }

  return responses;
}

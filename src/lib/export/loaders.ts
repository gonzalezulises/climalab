import { getCampaign, getCampaignResults, getOpenResponses } from "@/actions/campaigns";
import {
  getAlerts,
  getBenchmarkData,
  getCategoryScores,
  getEngagementDrivers,
  getHeatmapData,
  getReliabilityData,
} from "@/actions/analytics";
import { getPipelineOperationalSummary } from "@/actions/pipeline-ops";
import { getCampaignDataQuality } from "@/actions/data-quality";
import { getSemanticResultFamilies } from "@/actions/semantic-results";
import {
  getAlertContext,
  getCommentAnalysis,
  getDashboardNarrative,
  getDriverInsights,
  getSegmentProfiles,
  getTrendsNarrative,
} from "@/actions/ai-insights";
import { getBusinessIndicators } from "@/actions/business-indicators";
import { getONAResults } from "@/actions/ona";
import { getOrganization } from "@/actions/organizations";
import type { ActionResult, BrandConfig } from "@/types";
import { DEFAULT_BRAND_CONFIG } from "@/lib/constants";

type ResolveActionData<F extends (...args: never[]) => Promise<ActionResult<unknown>>> =
  Awaited<ReturnType<F>> extends ActionResult<infer Data> ? Data : never;

type CampaignRecord = ResolveActionData<typeof getCampaign>;
type CampaignResultRow = ResolveActionData<typeof getCampaignResults>[number];
type CategoryScoreRow = ResolveActionData<typeof getCategoryScores>[number];
type DriverRow = ResolveActionData<typeof getEngagementDrivers>[number];
type AlertRow = ResolveActionData<typeof getAlerts>[number];
type CommentRow = ResolveActionData<typeof getOpenResponses>[number];
type ReliabilityRow = ResolveActionData<typeof getReliabilityData>[number];
type HeatmapRow = ResolveActionData<typeof getHeatmapData>[number];
type PipelineSummary = ResolveActionData<typeof getPipelineOperationalSummary>;
type DataQualitySummary = ResolveActionData<typeof getCampaignDataQuality>;
type SemanticFamilyRow = ResolveActionData<typeof getSemanticResultFamilies>[number];
type BenchmarkData = ResolveActionData<typeof getBenchmarkData>;
type DashboardNarrative = ResolveActionData<typeof getDashboardNarrative>;
type CommentAnalysis = ResolveActionData<typeof getCommentAnalysis>;
type DriverInsights = ResolveActionData<typeof getDriverInsights>;
type AlertContext = ResolveActionData<typeof getAlertContext>;
type SegmentProfiles = ResolveActionData<typeof getSegmentProfiles>;
type TrendsNarrative = ResolveActionData<typeof getTrendsNarrative>;
type BusinessIndicatorRow = ResolveActionData<typeof getBusinessIndicators>[number];
type OnaResults = ResolveActionData<typeof getONAResults>;
type OrganizationRecord = ResolveActionData<typeof getOrganization>;

export type ExcelExportData = {
  campaign: CampaignRecord;
  results: CampaignResultRow[];
  categories: CategoryScoreRow[];
  drivers: DriverRow[];
  alerts: AlertRow[];
  comments: CommentRow[];
  reliability: ReliabilityRow[];
  heatmap: HeatmapRow[];
  pipeline: PipelineSummary | null;
  quality: DataQualitySummary | null;
  semanticFamilies: SemanticFamilyRow[];
};

export type DocxExportData = {
  campaign: CampaignRecord;
  results: CampaignResultRow[];
  categories: CategoryScoreRow[];
  drivers: DriverRow[];
  alerts: AlertRow[];
  reliability: ReliabilityRow[];
  benchmark: BenchmarkData | null;
  narrative: DashboardNarrative | null;
  commentAnalysis: CommentAnalysis | null;
  driverInsights: DriverInsights | null;
  alertContext: AlertContext | null;
  segmentProfiles: SegmentProfiles | null;
  trendsNarrative: TrendsNarrative | null;
  businessIndicators: BusinessIndicatorRow[];
  onaData: OnaResults | null;
  organization: {
    name: string;
    logoUrl: string | null;
    brand: BrandConfig;
  };
};

function normalizeActionData<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

function buildOrganizationSummary(
  campaign: CampaignRecord,
  organizationResult: ActionResult<OrganizationRecord>
) {
  const organizationName = organizationResult.success
    ? organizationResult.data.name
    : campaign.organization_id;
  const organizationLogoUrl = organizationResult.success ? organizationResult.data.logo_url : null;
  const organizationBrandConfig = organizationResult.success
    ? ((organizationResult.data.brand_config ?? {}) as Partial<BrandConfig>)
    : {};

  return {
    name: organizationName,
    logoUrl: organizationLogoUrl,
    brand: { ...DEFAULT_BRAND_CONFIG, ...organizationBrandConfig },
  };
}

export async function loadExcelExportData(
  campaignId: string
): Promise<ActionResult<ExcelExportData>> {
  const [
    campaignRes,
    resultsRes,
    categoriesRes,
    driversRes,
    alertsRes,
    commentsRes,
    reliabilityRes,
    heatmapRes,
    pipelineRes,
    qualityRes,
    semanticFamiliesRes,
  ] = await Promise.all([
    getCampaign(campaignId),
    getCampaignResults(campaignId),
    getCategoryScores(campaignId),
    getEngagementDrivers(campaignId),
    getAlerts(campaignId),
    getOpenResponses(campaignId),
    getReliabilityData(campaignId),
    getHeatmapData(campaignId),
    getPipelineOperationalSummary(campaignId),
    getCampaignDataQuality(campaignId),
    getSemanticResultFamilies(campaignId),
  ]);

  if (!campaignRes.success) {
    return { success: false, error: "Campaña no encontrada" };
  }

  return {
    success: true,
    data: {
      campaign: campaignRes.data,
      results: normalizeActionData(resultsRes, []),
      categories: normalizeActionData(categoriesRes, []),
      drivers: normalizeActionData(driversRes, []),
      alerts: normalizeActionData(alertsRes, []),
      comments: normalizeActionData(commentsRes, []),
      reliability: normalizeActionData(reliabilityRes, []),
      heatmap: normalizeActionData(heatmapRes, []),
      pipeline: normalizeActionData(pipelineRes, null),
      quality: normalizeActionData(qualityRes, null),
      semanticFamilies: normalizeActionData(semanticFamiliesRes, []),
    },
  };
}

export async function loadDocxExportData(
  campaignId: string
): Promise<ActionResult<DocxExportData>> {
  const [
    campaignRes,
    resultsRes,
    categoriesRes,
    driversRes,
    alertsRes,
    reliabilityRes,
    benchmarkRes,
    narrativeRes,
    commentRes,
    driverInsightsRes,
    alertContextRes,
    segmentProfilesRes,
    trendsNarrativeRes,
    businessIndicatorsRes,
    onaRes,
  ] = await Promise.all([
    getCampaign(campaignId),
    getCampaignResults(campaignId),
    getCategoryScores(campaignId),
    getEngagementDrivers(campaignId),
    getAlerts(campaignId),
    getReliabilityData(campaignId),
    getBenchmarkData(campaignId),
    getDashboardNarrative(campaignId),
    getCommentAnalysis(campaignId),
    getDriverInsights(campaignId),
    getAlertContext(campaignId),
    getSegmentProfiles(campaignId),
    getTrendsNarrative(campaignId),
    getBusinessIndicators(campaignId),
    getONAResults(campaignId),
  ]);

  if (!campaignRes.success) {
    return { success: false, error: "Campaña no encontrada" };
  }

  const organizationRes = await getOrganization(campaignRes.data.organization_id);

  return {
    success: true,
    data: {
      campaign: campaignRes.data,
      results: normalizeActionData(resultsRes, []),
      categories: normalizeActionData(categoriesRes, []),
      drivers: normalizeActionData(driversRes, []),
      alerts: normalizeActionData(alertsRes, []),
      reliability: normalizeActionData(reliabilityRes, []),
      benchmark: normalizeActionData(benchmarkRes, null),
      narrative: normalizeActionData(narrativeRes, null),
      commentAnalysis: normalizeActionData(commentRes, null),
      driverInsights: normalizeActionData(driverInsightsRes, null),
      alertContext: normalizeActionData(alertContextRes, null),
      segmentProfiles: normalizeActionData(segmentProfilesRes, null),
      trendsNarrative: normalizeActionData(trendsNarrativeRes, null),
      businessIndicators: normalizeActionData(businessIndicatorsRes, []),
      onaData: normalizeActionData(onaRes, null),
      organization: buildOrganizationSummary(campaignRes.data, organizationRes),
    },
  };
}

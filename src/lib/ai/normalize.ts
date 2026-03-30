import type {
  AlertContext,
  CampaignAiInsightType,
  CommentAnalysis,
  DashboardNarrative,
  DriverInsights,
  GovernedInsightClaim,
  SegmentProfiles,
  TrendsNarrative,
} from "@/lib/ai/contracts";

type NormalizeContext = {
  insightType: CampaignAiInsightType;
  dimensions?: Array<{ code: string; name: string }>;
  qualityCautions?: string[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function collectDimensionCodes(text: string, dimensions: Array<{ code: string; name: string }>) {
  const haystack = text.toLowerCase();
  return unique(
    dimensions
      .filter(
        (dimension) =>
          haystack.includes(dimension.code.toLowerCase()) ||
          haystack.includes(dimension.name.toLowerCase())
      )
      .map((dimension) => dimension.code)
  );
}

function buildClaim(
  statement: string,
  metricRefs: string[],
  dimensions: Array<{ code: string; name: string }>
): GovernedInsightClaim {
  return {
    statement,
    dimensionCodes: collectDimensionCodes(statement, dimensions),
    metricRefs,
    confidence: "medium",
  };
}

export function normalizeInsightClaims(
  payload:
    | CommentAnalysis
    | DashboardNarrative
    | DriverInsights
    | AlertContext
    | SegmentProfiles
    | TrendsNarrative,
  context: NormalizeContext
) {
  const dimensions = context.dimensions ?? [];

  switch (context.insightType) {
    case "comment_analysis": {
      const content = payload as CommentAnalysis;
      return [
        ...content.themes.map((theme) =>
          buildClaim(
            `${theme.theme}: ${theme.count} menciones con sentimiento ${theme.sentiment}`,
            ["comments.themes"],
            dimensions
          )
        ),
        buildClaim(content.summary.general, ["comments.summary.general"], dimensions),
      ];
    }
    case "dashboard_narrative": {
      const content = payload as DashboardNarrative;
      return [
        buildClaim(content.executive_summary, ["dashboard.executive_summary"], dimensions),
        ...content.highlights.map((highlight) =>
          buildClaim(highlight, ["dashboard.highlights"], dimensions)
        ),
        ...content.concerns.map((concern) =>
          buildClaim(concern, ["dashboard.concerns"], dimensions)
        ),
      ];
    }
    case "driver_insights": {
      const content = payload as DriverInsights;
      return [
        buildClaim(content.narrative, ["drivers.narrative"], dimensions),
        ...content.paradoxes.map((paradox) =>
          buildClaim(paradox, ["drivers.paradoxes"], dimensions)
        ),
        ...content.quick_wins.map((quickWin) =>
          buildClaim(
            `${quickWin.dimension}: ${quickWin.action} (${quickWin.impact})`,
            ["drivers.quick_wins"],
            dimensions
          )
        ),
      ];
    }
    case "alert_context": {
      const content = payload as AlertContext;
      return content.map((alert) =>
        buildClaim(
          `${alert.root_cause} ${alert.recommendation}`,
          [`alerts.${alert.alert_index}`],
          dimensions
        )
      );
    }
    case "segment_profiles": {
      const content = payload as SegmentProfiles;
      return content.map((profile) =>
        buildClaim(
          `${profile.segment} (${profile.segment_type}): ${profile.narrative}`,
          [`segments.${profile.segment_type}.${profile.segment}`],
          dimensions
        )
      );
    }
    case "trends_narrative": {
      const content = payload as TrendsNarrative;
      return [
        buildClaim(content.trajectory, ["trends.trajectory"], dimensions),
        ...content.improving.map((row) => buildClaim(row, ["trends.improving"], dimensions)),
        ...content.declining.map((row) => buildClaim(row, ["trends.declining"], dimensions)),
        ...content.inflection_points.map((row) =>
          buildClaim(row, ["trends.inflection_points"], dimensions)
        ),
      ];
    }
  }
}

export function extractInsightSummary(
  payload:
    | CommentAnalysis
    | DashboardNarrative
    | DriverInsights
    | AlertContext
    | SegmentProfiles
    | TrendsNarrative,
  insightType: CampaignAiInsightType
) {
  switch (insightType) {
    case "comment_analysis":
      return (payload as CommentAnalysis).summary.general;
    case "dashboard_narrative":
      return (payload as DashboardNarrative).executive_summary;
    case "driver_insights":
      return (payload as DriverInsights).narrative;
    case "alert_context":
      return (payload as AlertContext)[0]?.root_cause ?? "Contexto de alertas generado";
    case "segment_profiles":
      return (payload as SegmentProfiles)[0]?.narrative ?? "Perfiles de segmentos generados";
    case "trends_narrative":
      return (payload as TrendsNarrative).trajectory;
  }
}

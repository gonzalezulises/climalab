"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

// ---------------------------------------------------------------------------
// ONA result types
// ---------------------------------------------------------------------------

export interface ONAGraphSummary {
  nodes: number;
  edges: number;
  density: number;
  communities: number;
  modularity: number;
  avg_clustering: number;
}

export interface ONACommunity {
  id: number;
  size: number;
  pct: number;
  avg_score: number;
  dominant_department: string;
  department_distribution: Record<string, { count: number; pct: number }>;
  dimension_scores: Record<string, number>;
  top_differences: Array<{ code: string; diff: number; cluster_score: number }>;
}

export interface ONADiscriminant {
  code: string;
  spread: number;
  max_cluster: number;
  max_value: number;
  min_cluster: number;
  min_value: number;
}

export interface ONADeptDensity {
  [deptA: string]: { [deptB: string]: number | null };
}

export interface ONABridge {
  id: string;
  department: string;
  community: number;
  betweenness: number;
  communities_bridged: number;
  connections: number;
}

export interface ONAStability {
  nmi: number;
  label: "robust" | "moderate" | "weak";
  iterations: number;
  method: string;
}

export interface ONACriticalEdge {
  source_dept: string;
  target_dept: string;
  source_community: number;
  target_community: number;
  edge_betweenness: number;
  weight: number;
}

export interface ONAResults {
  summary: ONAGraphSummary;
  communities: ONACommunity[];
  discriminants: ONADiscriminant[];
  department_density: ONADeptDensity;
  bridges: ONABridge[];
  global_means: Record<string, number>;
  narrative?: string;
  generated_at: string;
  // New fields (optional for backwards compat with old data)
  stability?: ONAStability;
  critical_edges?: ONACriticalEdge[];
  graph_image?: string; // base64 PNG
}

// ---------------------------------------------------------------------------
// getONAResults — retrieve ONA network analysis from campaign_analytics
// ---------------------------------------------------------------------------
export async function getONAResults(campaignId: string): Promise<ActionResult<ONAResults>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "ona_network")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data.data as unknown as ONAResults };
}

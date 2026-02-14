"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createBusinessIndicatorSchema,
  type CreateBusinessIndicatorInput,
} from "@/lib/validations/business-indicator";
import type { ActionResult, BusinessIndicator } from "@/types";

// ---------------------------------------------------------------------------
// getBusinessIndicators — list indicators for a campaign
// ---------------------------------------------------------------------------
export async function getBusinessIndicators(
  campaignId: string
): Promise<ActionResult<BusinessIndicator[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_indicators")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

// ---------------------------------------------------------------------------
// createBusinessIndicator
// ---------------------------------------------------------------------------
export async function createBusinessIndicator(
  input: CreateBusinessIndicatorInput
): Promise<ActionResult<BusinessIndicator>> {
  const parsed = createBusinessIndicatorSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_indicators")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/campaigns/${parsed.data.campaign_id}`);
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// deleteBusinessIndicator
// ---------------------------------------------------------------------------
export async function deleteBusinessIndicator(
  id: string,
  campaignId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("business_indicators")
    .delete()
    .eq("id", id)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// getBusinessIndicatorsTrend — indicators across all closed campaigns for an org
// ---------------------------------------------------------------------------
export async function getBusinessIndicatorsTrend(
  organizationId: string
): Promise<
  ActionResult<
    Array<{
      campaign_id: string;
      campaign_name: string;
      ends_at: string;
      indicators: BusinessIndicator[];
    }>
  >
> {
  const supabase = await createClient();

  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id, name, ends_at")
    .eq("organization_id", organizationId)
    .in("status", ["closed", "archived"])
    .order("ends_at", { ascending: true });

  if (campErr) return { success: false, error: campErr.message };
  if (!campaigns || campaigns.length === 0) return { success: true, data: [] };

  const result = [];
  for (const c of campaigns) {
    const { data: indicators } = await supabase
      .from("business_indicators")
      .select("*")
      .eq("campaign_id", c.id)
      .order("created_at");

    result.push({
      campaign_id: c.id,
      campaign_name: c.name,
      ends_at: c.ends_at ?? "",
      indicators: indicators ?? [],
    });
  }

  return { success: true, data: result };
}

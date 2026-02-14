"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from "@/lib/validations/organization";
import type { ActionResult, Organization, BrandConfig } from "@/types";

export async function getOrganizations(): Promise<ActionResult<Organization[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function getOrganization(id: string): Promise<ActionResult<Organization>> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<ActionResult<Organization>> {
  const parsed = createOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/organizations");

  return { success: true, data };
}

export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput
): Promise<ActionResult<Organization>> {
  const parsed = updateOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/organizations/${id}`);

  return { success: true, data };
}

export async function updateOrganizationBranding(
  id: string,
  input: { logo_url?: string | null; brand_config?: Partial<BrandConfig> }
): Promise<ActionResult<Organization>> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.logo_url !== undefined) updateData.logo_url = input.logo_url;
  if (input.brand_config !== undefined) updateData.brand_config = input.brand_config;

  const { data, error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/organizations/${id}`);
  return { success: true, data };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  updateItemSchema,
  type UpdateItemInput,
} from "@/lib/validations/instrument";
import type { ActionResult, Instrument, InstrumentWithDimensions } from "@/types";

export async function getInstruments(): Promise<ActionResult<Instrument[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("instruments")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function getInstrumentWithItems(
  id: string
): Promise<ActionResult<InstrumentWithDimensions>> {
  const supabase = await createClient();

  const { data: instrument, error: instrumentError } = await supabase
    .from("instruments")
    .select("*")
    .eq("id", id)
    .single();

  if (instrumentError) {
    return { success: false, error: instrumentError.message };
  }

  const { data: dimensions, error: dimensionsError } = await supabase
    .from("dimensions")
    .select("*, items(*)")
    .eq("instrument_id", id)
    .order("sort_order", { ascending: true });

  if (dimensionsError) {
    return { success: false, error: dimensionsError.message };
  }

  // Sort items within each dimension
  const sortedDimensions = dimensions.map((dim) => ({
    ...dim,
    items: dim.items.sort((a, b) => a.sort_order - b.sort_order),
  }));

  return {
    success: true,
    data: { ...instrument, dimensions: sortedDimensions },
  };
}

export async function updateItem(
  input: UpdateItemInput
): Promise<ActionResult<void>> {
  const parsed = updateItemSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const { id, ...updates } = parsed.data;

  const { error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/instruments");

  return { success: true, data: undefined };
}

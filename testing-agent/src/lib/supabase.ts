import { createClient, type SupabaseClient as SC } from "@supabase/supabase-js";
import { getConfig } from "./config.js";

// Use `any` schema — this is a testing tool, no generated DB types
export type SupabaseClient = SC<any, any, any>;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const { supabaseUrl, supabaseServiceKey } = getConfig();
    client = createClient(supabaseUrl, supabaseServiceKey);
  }
  return client;
}

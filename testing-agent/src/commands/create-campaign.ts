import ora from "ora";
import chalk from "chalk";
import { getSupabase } from "../lib/supabase.js";
import { CORE_INSTRUMENT_ID, MODULE_IDS } from "../data/constants.js";

export interface CreateCampaignResult {
  campaignId: string;
  instrumentId: string;
  moduleIds: string[];
}

export async function createCampaignCommand(opts: {
  orgId: string;
  modules?: string[];
}): Promise<CreateCampaignResult> {
  const supabase = getSupabase();
  const spinner = ora("Creating campaign...").start();

  const moduleIds = (opts.modules ?? []).map((m) => MODULE_IDS[m.toUpperCase()]).filter(Boolean);

  const campaignName = `Test Campaign ${new Date().toISOString().slice(0, 10)}`;

  const { data: campaignData, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      organization_id: opts.orgId,
      instrument_id: CORE_INSTRUMENT_ID,
      module_instrument_ids: moduleIds,
      name: campaignName,
      status: "draft",
      measurement_objective: "initial_diagnosis",
    })
    .select("id")
    .single();

  if (campaignError || !campaignData) {
    spinner.fail("Failed to create campaign");
    throw new Error(`Create campaign error: ${campaignError?.message}`);
  }

  const moduleLabels = opts.modules?.length ? opts.modules.join(", ") : "none";
  spinner.succeed(
    `Created campaign: ${chalk.bold(campaignName)} (${campaignData.id})\n` +
      `  Instrument: Core v4.0, Modules: ${moduleLabels}`
  );

  return {
    campaignId: campaignData.id,
    instrumentId: CORE_INSTRUMENT_ID,
    moduleIds,
  };
}

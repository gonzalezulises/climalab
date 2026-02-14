import { notFound } from "next/navigation";
import { getCampaign } from "@/actions/campaigns";
import { getONAResults } from "@/actions/ona";
import { NetworkClient } from "./network-client";

export default async function NetworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, onaResult] = await Promise.all([getCampaign(id), getONAResults(id)]);

  if (!campaignResult.success) notFound();

  const onaData = onaResult.success ? onaResult.data : null;

  return <NetworkClient data={onaData} />;
}

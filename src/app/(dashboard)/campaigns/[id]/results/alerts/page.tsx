import { notFound } from "next/navigation";
import { getCampaign } from "@/actions/campaigns";
import { getAlerts } from "@/actions/analytics";
import { getAlertContext } from "@/actions/ai-insights";
import { AlertsClient } from "./alerts-client";

export default async function AlertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, alertsResult, contextResult] = await Promise.all([
    getCampaign(id),
    getAlerts(id),
    getAlertContext(id),
  ]);

  if (!campaignResult.success) notFound();
  const alerts = alertsResult.success ? alertsResult.data : [];
  const context = contextResult.success ? contextResult.data : null;

  return <AlertsClient campaignId={id} alerts={alerts} initialContext={context} />;
}

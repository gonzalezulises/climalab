import { notFound } from "next/navigation";
import { getCampaign } from "@/actions/campaigns";
import { getAlerts } from "@/actions/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const sevConfig: Record<string, { label: string; bg: string; border: string }> = {
  crisis: { label: "Crisis", bg: "bg-red-600 text-white", border: "border-l-red-600" },
  attention: { label: "Atención", bg: "bg-yellow-500 text-white", border: "border-l-yellow-500" },
  risk_group: { label: "Grupo de riesgo", bg: "bg-orange-500 text-white", border: "border-l-orange-500" },
  decline: { label: "Declive", bg: "bg-purple-500 text-white", border: "border-l-purple-500" },
};

export default async function AlertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, alertsResult] = await Promise.all([
    getCampaign(id),
    getAlerts(id),
  ]);

  if (!campaignResult.success) notFound();
  const alerts = alertsResult.success ? alertsResult.data : [];

  const crisisCount = alerts.filter((a) => a.severity === "crisis").length;
  const attentionCount = alerts.filter((a) => a.severity === "attention").length;
  const riskCount = alerts.filter((a) => a.severity === "risk_group").length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Alertas y Áreas de Riesgo</h1>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold">{alerts.length}</p>
            <p className="text-xs text-muted-foreground">Total alertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-red-600">{crisisCount}</p>
            <p className="text-xs text-muted-foreground">Crisis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-yellow-600">{attentionCount}</p>
            <p className="text-xs text-muted-foreground">Atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-orange-600">{riskCount}</p>
            <p className="text-xs text-muted-foreground">Grupos de riesgo</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <p className="text-muted-foreground">No se detectaron alertas. Todas las métricas están dentro de los umbrales aceptables.</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const sev = sevConfig[alert.severity] ?? sevConfig.attention;
            return (
              <Card key={i} className={`border-l-4 ${sev.border}`}>
                <CardContent className="py-3 flex items-start gap-3">
                  <Badge className={sev.bg}>{sev.label}</Badge>
                  <div className="flex-1">
                    <p className="text-sm">{alert.message}</p>
                    {alert.item_text && (
                      <p className="text-xs text-muted-foreground mt-1 italic">&quot;{alert.item_text}&quot;</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{typeof alert.value === "number" ? alert.value.toFixed(1) : alert.value}%</p>
                    <p className="text-xs text-muted-foreground">Umbral: {alert.threshold}%</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

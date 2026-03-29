import { redirect } from "next/navigation";
import { Activity, BellRing, DatabaseZap, RefreshCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPlatformOperationsOverview } from "@/actions/pipeline-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OperationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const overview = await getPlatformOperationsOverview();
  if (!overview.success) {
    throw new Error(overview.error);
  }

  const data = overview.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operaciones</h1>
        <p className="text-sm text-muted-foreground">
          Salud del pipeline, notificaciones operativas y candidatos de backfill.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Corridas batch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.latestBatchRuns.length}</p>
            <p className="text-xs text-muted-foreground">Últimas 10 registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.latestNotifications.length}</p>
            <p className="text-xs text-muted-foreground">Webhook, email o log</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCcw className="h-4 w-4" />
              Backfill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.backfillCandidates.length}</p>
            <p className="text-xs text-muted-foreground">Campañas con deuda analítica</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseZap className="h-4 w-4" />
              Versiones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="font-mono">{data.logicVersion}</p>
            <p className="font-mono text-muted-foreground">{data.ingestContractVersion}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas notificaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.latestNotifications.length === 0 ? (
              <p className="text-muted-foreground">Sin notificaciones recientes.</p>
            ) : (
              data.latestNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{notification.alertCode}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.channel} · {notification.recipient ?? "sin destinatario"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        notification.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {notification.severity}
                    </Badge>
                    <Badge variant="outline">{notification.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidatos de backfill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.backfillCandidates.length === 0 ? (
              <p className="text-muted-foreground">No hay campañas pendientes de backfill.</p>
            ) : (
              data.backfillCandidates.map((candidate) => (
                <div key={candidate.campaignId} className="rounded-md border p-3">
                  <p className="font-medium">{candidate.campaignName}</p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.reason} · lógica actual:{" "}
                    {candidate.latestLogicVersion ?? "sin corridas"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas corridas de backfill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data.latestBackfillRuns.length === 0 ? (
            <p className="text-muted-foreground">Sin corridas de backfill registradas.</p>
          ) : (
            data.latestBackfillRuns.map((run) => {
              const summary = (run.summary ?? {}) as {
                driftSummary?: { materialChanges?: number };
                performance?: { outlierCount?: number; maxMs?: number };
                attentionNeededCampaigns?: string[];
              };
              return (
                <div key={run.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{run.id}</p>
                    <Badge variant="outline">{run.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    seleccionadas {run.selected} · procesadas {run.processed} · exitosas{" "}
                    {run.succeeded} · fallidas {run.failed}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    drift material {summary.driftSummary?.materialChanges ?? 0} · outliers{" "}
                    {summary.performance?.outlierCount ?? 0} · pico{" "}
                    {summary.performance?.maxMs ?? 0}
                    ms
                  </p>
                  <p className="text-xs text-muted-foreground">
                    campañas con atención requerida {summary.attentionNeededCampaigns?.length ?? 0}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas corridas batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data.latestBatchRuns.map((run) => (
            <div key={run.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{run.id}</p>
                <Badge variant="outline">{run.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                procesadas {run.processed} · exitosas {run.succeeded} · fallidas {run.failed}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getRespondents } from "@/actions/campaigns";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RespondentStats = {
  completed: number;
  in_progress: number;
  pending: number;
  disqualified: number;
  total: number;
};

export function MonitoringPanel({
  campaignId,
  isActive,
  initialStats,
}: {
  campaignId: string;
  isActive: boolean;
  initialStats: RespondentStats;
}) {
  const [stats, setStats] = useState(initialStats);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(async () => {
      const result = await getRespondents(campaignId);
      if (result.success) {
        const respondents = result.data;
        setStats({
          completed: respondents.filter((r) => r.status === "completed").length,
          in_progress: respondents.filter((r) => r.status === "in_progress").length,
          pending: respondents.filter((r) => r.status === "pending").length,
          disqualified: respondents.filter((r) => r.status === "disqualified").length,
          total: respondents.length,
        });
        setLastUpdate(new Date());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [campaignId, isActive]);

  const responsePct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {isActive && (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="animate-pulse">
            En vivo
          </Badge>
          <span className="text-xs text-muted-foreground">
            Actualización automática cada 30s · Última: {lastUpdate.toLocaleTimeString("es-MX")}
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completados</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En progreso</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.in_progress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-3xl text-gray-500">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Descalificados</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.disqualified}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasa de respuesta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {stats.completed} de {stats.total} participantes
                </span>
                <span className="font-medium">{responsePct}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${responsePct}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

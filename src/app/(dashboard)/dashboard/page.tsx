import Link from "next/link";
import { getOrganizations } from "@/actions/organizations";
import { getCampaigns } from "@/actions/campaigns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const [orgsResult, campaignsResult] = await Promise.all([getOrganizations(), getCampaigns()]);

  const organizations = orgsResult.success ? orgsResult.data : [];
  const campaigns = campaignsResult.success ? campaignsResult.data : [];

  const orgById = new Map(organizations.map((o) => [o.id, o]));

  const activeCampaigns = campaigns
    .filter((c) => c.status === "active")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const closedCampaigns = campaigns
    .filter((c) => c.status === "closed" || c.status === "archived")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const now = new Date();

  const avgResponseRate =
    closedCampaigns.length > 0
      ? Math.round(
          closedCampaigns.reduce((sum, c) => sum + (c.response_rate ?? 0), 0) /
            closedCampaigns.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-muted-foreground">Visión general de la plataforma</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Organizaciones</CardDescription>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Campañas activas</CardDescription>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Mediciones cerradas</CardDescription>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter((c) => c.status === "closed" || c.status === "archived").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Tasa promedio</CardDescription>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgResponseRate > 0 ? `${avgResponseRate}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Campañas Activas</CardTitle>
            <CardDescription>Mediciones en curso con progreso de respuesta</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/campaigns">
              Ver todas <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activeCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay campañas activas en este momento
            </p>
          ) : (
            <div className="space-y-4">
              {activeCampaigns.map((campaign) => {
                const org = orgById.get(campaign.organization_id);
                const target = campaign.target_population ?? campaign.population_n ?? 0;
                const responded = campaign.sample_n ?? 0;
                const rate = target > 0 ? Math.round((responded / target) * 100) : 0;
                const daysLeft = campaign.ends_at
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(campaign.ends_at).getTime() - now.getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                  : null;

                return (
                  <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{campaign.name}</span>
                          {org && (
                            <span className="text-sm text-muted-foreground">· {org.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>
                            {responded}/{target} respuestas
                          </span>
                          {daysLeft !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {daysLeft === 0 ? "Vence hoy" : `${daysLeft} días restantes`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{rate}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(100, rate)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Closed Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Últimas Mediciones</CardTitle>
            <CardDescription>Campañas cerradas más recientes</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/campaigns">
              Ver todas <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {closedCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay mediciones cerradas aún
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-2 font-medium">Campaña</th>
                    <th className="text-left py-2 font-medium">Organización</th>
                    <th className="text-right py-2 font-medium">Tasa</th>
                    <th className="text-right py-2 font-medium">Muestra</th>
                    <th className="text-right py-2 font-medium">Cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {closedCampaigns.map((campaign) => {
                    const org = orgById.get(campaign.organization_id);
                    return (
                      <tr key={campaign.id} className="border-t">
                        <td className="py-2">
                          <Link
                            href={`/campaigns/${campaign.id}/results/dashboard`}
                            className="hover:underline font-medium"
                          >
                            {campaign.name}
                          </Link>
                        </td>
                        <td className="py-2 text-muted-foreground">{org?.name ?? "—"}</td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={
                              campaign.response_rate && campaign.response_rate >= 80
                                ? "default"
                                : "secondary"
                            }
                          >
                            {campaign.response_rate ?? 0}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">{campaign.sample_n ?? 0}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {campaign.ends_at
                            ? new Date(campaign.ends_at).toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Campaña
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Organización
          </Link>
        </Button>
      </div>
    </div>
  );
}

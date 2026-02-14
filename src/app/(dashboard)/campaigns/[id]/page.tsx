import { notFound } from "next/navigation";
import Link from "next/link";
import { getCampaign, getRespondents } from "@/actions/campaigns";
import { getParticipants } from "@/actions/participants";
import { getOrganization } from "@/actions/organizations";
import { getBusinessIndicators } from "@/actions/business-indicators";
import { env } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BarChart3 } from "lucide-react";
import { CampaignActions } from "./campaign-actions";
import { ParticipantsPanel } from "./participants-panel";
import { MonitoringPanel } from "./monitoring-panel";
import { BusinessIndicatorsPanel } from "@/components/results/business-indicators-panel";
import type { Department } from "@/types";

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Borrador", variant: "secondary" },
  active: { label: "Activa", variant: "default" },
  closed: { label: "Cerrada", variant: "outline" },
  archived: { label: "Archivada", variant: "destructive" },
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, respondentsResult, participantsResult, indicatorsResult] =
    await Promise.all([
      getCampaign(id),
      getRespondents(id),
      getParticipants(id),
      getBusinessIndicators(id),
    ]);

  if (!campaignResult.success) {
    notFound();
  }

  const campaign = campaignResult.data;
  const respondents = respondentsResult.success ? respondentsResult.data : [];
  const participants = participantsResult.success ? participantsResult.data : [];
  const indicators = indicatorsResult.success ? indicatorsResult.data : [];

  const orgResult = await getOrganization(campaign.organization_id);
  const orgName = orgResult.success ? orgResult.data.name : "—";
  const allOrgDepts = orgResult.success
    ? ((orgResult.data.departments as Department[] | null) ?? []).map((d) => d.name)
    : [];
  const targetDepts = campaign.target_departments as string[] | null;
  const departments =
    targetDepts && targetDepts.length > 0
      ? allOrgDepts.filter((name) => targetDepts.includes(name))
      : allOrgDepts;

  const statusInfo = STATUS_LABELS[campaign.status] ?? STATUS_LABELS.draft;

  const completedCount = respondents.filter((r) => r.status === "completed").length;
  const inProgressCount = respondents.filter((r) => r.status === "in_progress").length;
  const pendingCount = respondents.filter((r) => r.status === "pending").length;

  const baseUrl = env.NEXT_PUBLIC_SITE_URL;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <p className="text-muted-foreground">{orgName}</p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "closed" && (
            <Link href={`/campaigns/${id}/results`}>
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Ver resultados
              </Button>
            </Link>
          )}
          <CampaignActions campaign={campaign} participantCount={participants.length} />
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="participants">Participantes ({participants.length})</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoreo</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Anónima</p>
                  <p>{campaign.anonymous ? "Sí" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha inicio</p>
                  <p>
                    {campaign.starts_at
                      ? new Date(campaign.starts_at).toLocaleDateString("es-MX")
                      : "No definida"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha fin</p>
                  <p>
                    {campaign.ends_at
                      ? new Date(campaign.ends_at).toLocaleDateString("es-MX")
                      : "No definida"}
                  </p>
                </div>
              </div>
              {campaign.population_n !== null && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Ficha técnica</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Población (N): </span>
                        {campaign.population_n}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Muestra (n): </span>
                        {campaign.sample_n}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Respuesta: </span>
                        {campaign.response_rate}%
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margen error: </span>±
                        {campaign.margin_of_error}%
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Participantes</CardTitle>
              <CardDescription>
                Agrega participantes, envía invitaciones por email y monitorea su progreso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParticipantsPanel
                campaignId={campaign.id}
                campaignStatus={campaign.status}
                participants={participants}
                departments={departments}
                baseUrl={baseUrl}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <MonitoringPanel
            campaignId={campaign.id}
            isActive={campaign.status === "active"}
            initialStats={{
              completed: completedCount,
              in_progress: inProgressCount,
              pending: pendingCount,
              disqualified: respondents.filter((r) => r.status === "disqualified").length,
              total: respondents.length,
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Business indicators */}
      <BusinessIndicatorsPanel campaignId={id} indicators={indicators} />
    </div>
  );
}

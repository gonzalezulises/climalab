import { notFound } from "next/navigation";
import Link from "next/link";
import { getCampaign, getRespondents } from "@/actions/campaigns";
import { getOrganization } from "@/actions/organizations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { BarChart3 } from "lucide-react";
import { CampaignActions } from "./campaign-actions";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  active: { label: "Activa", variant: "default" },
  closed: { label: "Cerrada", variant: "outline" },
  archived: { label: "Archivada", variant: "destructive" },
};

const RESPONDENT_STATUS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completado",
  disqualified: "Descalificado",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaignResult, respondentsResult] = await Promise.all([
    getCampaign(id),
    getRespondents(id),
  ]);

  if (!campaignResult.success) {
    notFound();
  }

  const campaign = campaignResult.data;
  const respondents = respondentsResult.success ? respondentsResult.data : [];

  const orgResult = await getOrganization(campaign.organization_id);
  const orgName = orgResult.success ? orgResult.data.name : "—";

  const statusInfo = STATUS_LABELS[campaign.status] ?? STATUS_LABELS.draft;

  const completedCount = respondents.filter((r) => r.status === "completed").length;
  const inProgressCount = respondents.filter((r) => r.status === "in_progress").length;
  const pendingCount = respondents.filter((r) => r.status === "pending").length;

  const baseUrl = typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    : "http://localhost:3000";

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
          <CampaignActions campaign={campaign} />
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="participants">
            Participantes ({respondents.length})
          </TabsTrigger>
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
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Ficha técnica
                    </p>
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
                        <span className="text-muted-foreground">Margen error: </span>
                        ±{campaign.margin_of_error}%
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
              <CardTitle>Enlaces de participación</CardTitle>
              <CardDescription>
                Genera y comparte enlaces para que los participantes respondan la encuesta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {respondents.length === 0 ? (
                <p className="text-muted-foreground">
                  No se han generado enlaces. Usa el botón de acciones para generar.
                </p>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Enlace</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {respondents.slice(0, 50).map((resp, idx) => (
                        <TableRow key={resp.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {resp.token.slice(0, 12)}...
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                resp.status === "completed"
                                  ? "default"
                                  : resp.status === "in_progress"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {RESPONDENT_STATUS[resp.status] ?? resp.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs text-muted-foreground">
                              {baseUrl}/survey/{resp.token}
                            </code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {respondents.length > 50 && (
                    <p className="text-sm text-muted-foreground">
                      Mostrando 50 de {respondents.length} enlaces
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completados</CardDescription>
                <CardTitle className="text-3xl">{completedCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>En progreso</CardDescription>
                <CardTitle className="text-3xl">{inProgressCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pendientes</CardDescription>
                <CardTitle className="text-3xl">{pendingCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {respondents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tasa de respuesta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {completedCount} de {respondents.length} participantes
                    </span>
                    <span>
                      {Math.round((completedCount / respondents.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{
                        width: `${(completedCount / respondents.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

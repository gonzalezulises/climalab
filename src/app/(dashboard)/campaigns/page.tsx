import Link from "next/link";
import { getCampaigns } from "@/actions/campaigns";
import { getOrganizations } from "@/actions/organizations";
import { getInstruments } from "@/actions/instruments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Plus } from "lucide-react";
import { CreateCampaignDialog } from "./create-campaign-dialog";

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Borrador", variant: "secondary" },
  active: { label: "Activa", variant: "default" },
  closed: { label: "Cerrada", variant: "outline" },
  archived: { label: "Archivada", variant: "destructive" },
};

export default async function CampaignsPage() {
  const [campaignsResult, orgsResult, instrumentsResult] = await Promise.all([
    getCampaigns(),
    getOrganizations(),
    getInstruments(),
  ]);

  const campaigns = campaignsResult.success ? campaignsResult.data : [];
  const organizations = orgsResult.success ? orgsResult.data : [];
  const instruments = instrumentsResult.success ? instrumentsResult.data : [];

  // Build lookup maps
  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));
  const instrMap = new Map(instruments.map((i) => [i.id, i.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campañas</h1>
          <p className="text-muted-foreground">
            Gestiona las olas de medición de clima organizacional
          </p>
        </div>
        <CreateCampaignDialog organizations={organizations} instruments={instruments} />
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay campañas registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const statusInfo = STATUS_LABELS[campaign.status] ?? STATUS_LABELS.draft;
            return (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                    <CardDescription>
                      {orgMap.get(campaign.organization_id) ?? "—"} ·{" "}
                      {instrMap.get(campaign.instrument_id) ?? "—"}
                      {(campaign.module_instrument_ids ?? []).length > 0 && (
                        <>
                          {" "}
                          +{" "}
                          {(campaign.module_instrument_ids as string[])
                            .map((mid) => instrMap.get(mid))
                            .filter(Boolean)
                            .join(", ")}
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {campaign.starts_at && (
                        <span>
                          Inicio: {new Date(campaign.starts_at).toLocaleDateString("es-MX")}
                        </span>
                      )}
                      {campaign.ends_at && (
                        <span>Fin: {new Date(campaign.ends_at).toLocaleDateString("es-MX")}</span>
                      )}
                      {campaign.response_rate !== null && (
                        <span>Respuesta: {campaign.response_rate}%</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

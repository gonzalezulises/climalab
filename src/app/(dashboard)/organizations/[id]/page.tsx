import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrganization } from "@/actions/organizations";
import { getCampaigns } from "@/actions/campaigns";
import { Badge } from "@/components/ui/badge";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SIZE_CATEGORIES, COUNTRIES } from "@/lib/constants";
import type { Department } from "@/types";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getOrganization(id);

  if (!result.success) {
    notFound();
  }

  const org = result.data;
  const countryName =
    COUNTRIES.find((c) => c.code === org.country)?.name || org.country;

  const departments = (org.departments as unknown as Department[]) ?? [];
  const totalHeadcount = departments.reduce(
    (sum, d) => sum + (d.headcount ?? 0),
    0
  );

  const campaignsResult = await getCampaigns(id);
  const campaigns = campaignsResult.success ? campaignsResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
          <Badge variant="secondary">
            {SIZE_CATEGORIES[org.size_category]}
          </Badge>
        </div>
        {(org as { commercial_name?: string | null }).commercial_name && (
          <p className="text-lg text-muted-foreground">
            {(org as { commercial_name?: string | null }).commercial_name}
          </p>
        )}
        <p className="text-muted-foreground">{org.slug}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Industria
                  </p>
                  <p>{org.industry || "No especificada"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    País
                  </p>
                  <p>{countryName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Empleados
                  </p>
                  <p>{org.employee_count}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Categoría
                  </p>
                  <p>{SIZE_CATEGORIES[org.size_category]}</p>
                </div>
              </div>

              {/* Contact section */}
              {((org as { contact_name?: string | null }).contact_name ||
                (org as { contact_email?: string | null }).contact_email) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Contacto principal
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {(org as { contact_name?: string | null })
                        .contact_name && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Nombre
                          </p>
                          <p>
                            {
                              (org as { contact_name?: string | null })
                                .contact_name
                            }
                          </p>
                        </div>
                      )}
                      {(org as { contact_email?: string | null })
                        .contact_email && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Email
                          </p>
                          <a
                            href={`mailto:${(org as { contact_email?: string | null }).contact_email}`}
                            className="text-primary hover:underline"
                          >
                            {
                              (org as { contact_email?: string | null })
                                .contact_email
                            }
                          </a>
                        </div>
                      )}
                      {(org as { contact_role?: string | null })
                        .contact_role && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Cargo
                          </p>
                          <p>
                            {
                              (org as { contact_role?: string | null })
                                .contact_role
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  Creada: {new Date(org.created_at).toLocaleDateString("es-MX")}
                </div>
                <div>
                  Actualizada:{" "}
                  {new Date(org.updated_at).toLocaleDateString("es-MX")}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Departamentos</CardTitle>
              <CardDescription>
                {departments.length} departamentos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? (
                <p className="text-muted-foreground">
                  No hay departamentos registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Personas</TableHead>
                      <TableHead className="text-right">% del Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.name}>
                        <TableCell>{dept.name}</TableCell>
                        <TableCell className="text-right">
                          {dept.headcount ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {dept.headcount != null && totalHeadcount > 0
                            ? `${Math.round((dept.headcount / totalHeadcount) * 100)}%`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-medium">
                        {totalHeadcount}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {totalHeadcount > 0 ? "100%" : "—"}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de mediciones</CardTitle>
              <CardDescription>
                {campaigns.length} campañas registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-muted-foreground">
                  No hay mediciones registradas aún.
                </p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <Link
                      key={campaign.id}
                      href={
                        campaign.status === "closed"
                          ? `/campaigns/${campaign.id}/results`
                          : `/campaigns/${campaign.id}`
                      }
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(campaign.created_at).toLocaleDateString("es-MX")}
                          {campaign.response_rate !== null &&
                            ` · Respuesta: ${campaign.response_rate}%`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          campaign.status === "active"
                            ? "default"
                            : campaign.status === "closed"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {campaign.status === "draft"
                          ? "Borrador"
                          : campaign.status === "active"
                            ? "Activa"
                            : campaign.status === "closed"
                              ? "Cerrada"
                              : "Archivada"}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

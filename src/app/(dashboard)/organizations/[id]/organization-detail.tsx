"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrganization, updateOrganizationBranding } from "@/actions/organizations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DepartmentEditor } from "@/components/department-editor";
import { LogoUpload } from "@/components/branding/logo-upload";
import { BrandConfigEditor } from "@/components/branding/brand-config-editor";
import { Pencil } from "lucide-react";
import { SIZE_CATEGORIES, COUNTRIES } from "@/lib/constants";
import type { Organization, Campaign, Department, BrandConfig } from "@/types";

type OrgWithExtras = Organization & {
  commercial_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_role?: string | null;
};

export function OrganizationDetail({
  org: initialOrg,
  campaigns,
}: {
  org: Organization;
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const org = initialOrg as OrgWithExtras;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state — initialized from org
  const [name, setName] = useState(org.name);
  const [commercialName, setCommercialName] = useState(org.commercial_name ?? "");
  const [slug, setSlug] = useState(org.slug);
  const [industry, setIndustry] = useState(org.industry ?? "");
  const [country, setCountry] = useState(org.country);
  const [employeeCount, setEmployeeCount] = useState(String(org.employee_count));
  const [contactName, setContactName] = useState(org.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(org.contact_email ?? "");
  const [contactRole, setContactRole] = useState(org.contact_role ?? "");
  const [departments, setDepartments] = useState<Department[]>(
    (org.departments as unknown as Department[]) ?? []
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logo_url);
  const [brandConfig, setBrandConfig] = useState<Partial<BrandConfig>>(
    (org.brand_config as unknown as Partial<BrandConfig>) ?? {}
  );
  const [savingBrand, setSavingBrand] = useState(false);

  const totalHeadcount = departments.reduce((sum, d) => sum + (d.headcount ?? 0), 0);

  const countryName =
    COUNTRIES.find((c) => c.code === (editing ? country : org.country))?.name || org.country;

  function startEditing() {
    // Reset form state to current org data
    setName(org.name);
    setCommercialName(org.commercial_name ?? "");
    setSlug(org.slug);
    setIndustry(org.industry ?? "");
    setCountry(org.country);
    setEmployeeCount(String(org.employee_count));
    setContactName(org.contact_name ?? "");
    setContactEmail(org.contact_email ?? "");
    setContactRole(org.contact_role ?? "");
    setDepartments((org.departments as unknown as Department[]) ?? []);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateOrganization(org.id, {
      name,
      commercial_name: commercialName || undefined,
      slug,
      industry: industry || undefined,
      country,
      employee_count: Number(employeeCount) || 0,
      departments,
      contact_name: contactName || undefined,
      contact_email: contactEmail || undefined,
      contact_role: contactRole || undefined,
    });

    if (result.success) {
      toast.success("Organización actualizada");
      setEditing(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
            <Badge variant="secondary">{SIZE_CATEGORIES[org.size_category]}</Badge>
          </div>
          {org.commercial_name && (
            <p className="text-lg text-muted-foreground">{org.commercial_name}</p>
          )}
          <p className="text-muted-foreground">{org.slug}</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
          <TabsTrigger value="branding">Identidad visual</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* ===== INFO TAB ===== */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Razón social</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Nombre comercial</Label>
                      <Input
                        value={commercialName}
                        onChange={(e) => setCommercialName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Slug</Label>
                      <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Industria</Label>
                      <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>País</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Empleados</Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(e.target.value)}
                      />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Contacto principal</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Nombre</Label>
                      <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Cargo</Label>
                      <Input value={contactRole} onChange={(e) => setContactRole(e.target.value)} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Industria</p>
                      <p>{org.industry || "No especificada"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">País</p>
                      <p>{countryName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Empleados</p>
                      <p>{org.employee_count}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                      <p>{SIZE_CATEGORIES[org.size_category]}</p>
                    </div>
                  </div>

                  {(org.contact_name || org.contact_email) && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Contacto principal
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          {org.contact_name && (
                            <div>
                              <p className="text-sm text-muted-foreground">Nombre</p>
                              <p>{org.contact_name}</p>
                            </div>
                          )}
                          {org.contact_email && (
                            <div>
                              <p className="text-sm text-muted-foreground">Email</p>
                              <a
                                href={`mailto:${org.contact_email}`}
                                className="text-primary hover:underline"
                              >
                                {org.contact_email}
                              </a>
                            </div>
                          )}
                          {org.contact_role && (
                            <div>
                              <p className="text-sm text-muted-foreground">Cargo</p>
                              <p>{org.contact_role}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>Creada: {new Date(org.created_at).toLocaleDateString("es-MX")}</div>
                <div>Actualizada: {new Date(org.updated_at).toLocaleDateString("es-MX")}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DEPARTMENTS TAB ===== */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Departamentos</CardTitle>
              <CardDescription>{departments.length} departamentos registrados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <DepartmentEditor
                  departments={departments}
                  onChange={setDepartments}
                  employeeCount={Number(employeeCount) || undefined}
                />
              ) : departments.length === 0 ? (
                <p className="text-muted-foreground">No hay departamentos registrados</p>
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
                        <TableCell className="text-right">{dept.headcount ?? "—"}</TableCell>
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
                      <TableCell className="text-right font-medium">{totalHeadcount}</TableCell>
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

        {/* ===== BRANDING TAB ===== */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identidad visual</CardTitle>
              <CardDescription>
                Personaliza colores, logo y textos que se aplicarán en la encuesta, emails, reportes
                PDF y panel de resultados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <LogoUpload orgId={org.id} currentUrl={logoUrl} onLogoChange={setLogoUrl} />
              <Separator />
              <BrandConfigEditor
                config={brandConfig}
                onChange={setBrandConfig}
                logoUrl={logoUrl}
                orgName={org.name}
              />
              <Separator />
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    setSavingBrand(true);
                    const result = await updateOrganizationBranding(org.id, {
                      logo_url: logoUrl,
                      brand_config: brandConfig,
                    });
                    if (result.success) {
                      toast.success("Identidad visual actualizada");
                    } else {
                      toast.error(result.error);
                    }
                    setSavingBrand(false);
                  }}
                  disabled={savingBrand}
                >
                  {savingBrand ? "Guardando..." : "Guardar identidad visual"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de mediciones</CardTitle>
              <CardDescription>{campaigns.length} campañas registradas</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-muted-foreground">No hay mediciones registradas aún.</p>
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

      {/* Sticky save/cancel bar */}
      {editing && (
        <div className="sticky bottom-4 flex justify-end gap-2 p-3 rounded-lg border bg-background shadow-lg">
          <Button variant="outline" onClick={cancelEditing} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </div>
  );
}

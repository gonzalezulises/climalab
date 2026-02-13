import { notFound } from "next/navigation";
import { getOrganization } from "@/actions/organizations";
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
import { Separator } from "@/components/ui/separator";
import { SIZE_CATEGORIES, COUNTRIES } from "@/lib/constants";

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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
          <Badge variant="secondary">
            {SIZE_CATEGORIES[org.size_category]}
          </Badge>
        </div>
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
                {org.departments.length} departamentos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {org.departments.length === 0 ? (
                <p className="text-muted-foreground">
                  No hay departamentos registrados
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {org.departments.map((dept) => (
                    <Badge key={dept} variant="outline">
                      {dept}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
              <CardDescription>
                Historial de mediciones y actividad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No hay mediciones registradas aún. Esta funcionalidad estará
                disponible en futuras versiones.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

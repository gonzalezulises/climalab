import Link from "next/link";
import { getOrganizations } from "@/actions/organizations";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Users } from "lucide-react";
import { SIZE_CATEGORIES } from "@/lib/constants";

export default async function DashboardPage() {
  const result = await getOrganizations();
  const organizations = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Panel de Control
          </h1>
          <p className="text-muted-foreground">
            {organizations.length} organizaciones
          </p>
        </div>
        <Button asChild>
          <Link href="/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Organización
          </Link>
        </Button>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay organizaciones registradas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <Badge variant="secondary">
                      {SIZE_CATEGORIES[org.size_category]}
                    </Badge>
                  </div>
                  <CardDescription>{org.industry || org.country}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{org.employee_count} empleados</span>
                    </div>
                    <span>{org.departments.length} departamentos</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

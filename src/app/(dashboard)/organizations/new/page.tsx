"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrganization } from "@/actions/organizations";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { COUNTRIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function NewOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptInput, setDeptInput] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  function addDepartment() {
    const trimmed = deptInput.trim();
    if (trimmed && !departments.includes(trimmed)) {
      setDepartments([...departments, trimmed]);
      setDeptInput("");
    }
  }

  function removeDepartment(dept: string) {
    setDepartments(departments.filter((d) => d !== dept));
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setErrors({});

    const raw = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      industry: (formData.get("industry") as string) || undefined,
      country: formData.get("country") as string,
      employee_count: Number(formData.get("employee_count")),
      departments,
    };

    const parsed = createOrganizationSchema.safeParse(raw);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    const result = await createOrganization(parsed.data);

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success("Organizacion creada exitosamente");
    router.push(`/organizations/${result.data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Organizacion</CardTitle>
          <CardDescription>
            Registra una nueva organizacion en la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(generateSlug(e.target.value));
                }}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industria</Label>
              <Input id="industry" name="industry" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Pais</Label>
              <Select name="country" defaultValue="MX">
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
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_count">Numero de empleados</Label>
              <Input
                id="employee_count"
                name="employee_count"
                type="number"
                min={1}
                max={200}
                required
              />
              {errors.employee_count && (
                <p className="text-sm text-destructive">
                  {errors.employee_count}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Departamentos</Label>
              <div className="flex gap-2">
                <Input
                  value={deptInput}
                  onChange={(e) => setDeptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDepartment();
                    }
                  }}
                  placeholder="Nombre del departamento"
                />
                <Button type="button" variant="outline" onClick={addDepartment}>
                  Agregar
                </Button>
              </div>
              {departments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {departments.map((dept) => (
                    <Badge
                      key={dept}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {dept}
                      <button
                        type="button"
                        onClick={() => removeDepartment(dept)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear Organizacion"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

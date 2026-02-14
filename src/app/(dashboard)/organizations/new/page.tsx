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
import { DepartmentEditor } from "@/components/department-editor";
import { Check } from "lucide-react";

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

type Department = { name: string; headcount: number | null };

const STEPS = [
  { number: 1, label: "Datos del Cliente" },
  { number: 2, label: "Departamentos" },
  { number: 3, label: "Contacto" },
];

export default function NewOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1
  const [name, setName] = useState("");
  const [commercialName, setCommercialName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("MX");
  const [employeeCount, setEmployeeCount] = useState("");

  // Step 2
  const [departments, setDepartments] = useState<Department[]>([]);

  // Step 3
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");

  const empCount = Number(employeeCount) || 0;

  function validateStep(): boolean {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!name || name.length < 2)
        stepErrors.name = "Mínimo 2 caracteres";
      if (!slug || slug.length < 2)
        stepErrors.slug = "Mínimo 2 caracteres";
      else if (!/^[a-z0-9-]+$/.test(slug))
        stepErrors.slug = "Solo letras minúsculas, números y guiones";
      if (!country) stepErrors.country = "País requerido";
      if (!employeeCount || empCount < 1)
        stepErrors.employee_count = "Mínimo 1 empleado";
      if (empCount > 500)
        stepErrors.employee_count = "Máximo 500 empleados";
    }

    if (step === 3) {
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
        stepErrors.contact_email = "Email inválido";
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function handleNext() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3);
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);
  }

  async function handleSubmit() {
    if (!validateStep()) return;

    setLoading(true);
    const raw = {
      name,
      commercial_name: commercialName || undefined,
      slug,
      industry: industry || undefined,
      country,
      employee_count: empCount,
      departments,
      contact_name: contactName || undefined,
      contact_email: contactEmail || undefined,
      contact_role: contactRole || undefined,
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

    toast.success("Organización creada exitosamente");
    router.push(`/organizations/${result.data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium border-2 ${
                step > s.number
                  ? "bg-primary border-primary text-primary-foreground"
                  : step === s.number
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {step > s.number ? <Check className="h-4 w-4" /> : s.number}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                step === s.number
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  step > s.number ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Datos del Cliente"}
            {step === 2 && "Departamentos"}
            {step === 3 && "Contacto Principal"}
          </CardTitle>
          <CardDescription>
            {step === 1 &&
              "Información básica de la organización."}
            {step === 2 &&
              "Define los departamentos y su dotación."}
            {step === 3 &&
              "Persona de contacto para la medición."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Client Data */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Razón social *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(generateSlug(e.target.value));
                  }}
                  placeholder="Empresa Demo S.A."
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="commercial_name">Nombre comercial</Label>
                <Input
                  id="commercial_name"
                  value={commercialName}
                  onChange={(e) => setCommercialName(e.target.value)}
                  placeholder="Demo Corp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industria</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>País *</Label>
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
                  {errors.country && (
                    <p className="text-sm text-destructive">
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_count">
                  Número total de empleados *
                </Label>
                <Input
                  id="employee_count"
                  type="number"
                  min={1}
                  max={500}
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                />
                {errors.employee_count && (
                  <p className="text-sm text-destructive">
                    {errors.employee_count}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 2: Departments */}
          {step === 2 && (
            <DepartmentEditor
              departments={departments}
              onChange={setDepartments}
              employeeCount={empCount}
            />
          )}

          {/* Step 3: Contact */}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Persona responsable de coordinar la medición de clima en la
                organización.
              </p>

              <div className="space-y-2">
                <Label htmlFor="contact_name">Nombre</Label>
                <Input
                  id="contact_name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="María González"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="maria@empresa.com"
                />
                {errors.contact_email && (
                  <p className="text-sm text-destructive">
                    {errors.contact_email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_role">Cargo</Label>
                <Input
                  id="contact_role"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="Directora de Recursos Humanos"
                />
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? () => router.back() : handleBack}
            >
              {step === 1 ? "Cancelar" : "Anterior"}
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={handleNext}>
                Siguiente
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Creando..." : "Crear Organización"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  slug: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  industry: z.string().max(100).optional(),
  country: z.string().length(2, "Código de país de 2 letras"),
  employee_count: z
    .number()
    .int()
    .min(1, "Mínimo 1 empleado")
    .max(500, "Máximo 500 empleados"),
  departments: z.array(z.string().min(1).max(100)).default([]),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

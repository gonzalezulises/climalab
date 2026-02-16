import ora from "ora";
import chalk from "chalk";
import { getSupabase } from "../lib/supabase.js";
import { generateOrg, type GeneratedOrg } from "../data/generate-org.js";

export interface CreateOrgResult {
  orgId: string;
  org: GeneratedOrg;
}

export async function createOrgCommand(opts: {
  name?: string;
  employees?: number;
  departments?: number;
  userEmail?: string;
}): Promise<CreateOrgResult> {
  const supabase = getSupabase();
  const spinner = ora("Creating organization...").start();

  const org = generateOrg({
    name: opts.name,
    employeeCount: opts.employees,
    departmentCount: opts.departments,
  });

  // Generate slug from name
  const slug =
    org.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + `-${Date.now().toString(36)}`;

  // Create org
  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: org.name,
      slug,
      country: org.country,
      industry: org.industry,
      employee_count: org.employee_count,
      departments: org.departments,
    })
    .select("id")
    .single();

  if (orgError || !orgData) {
    spinner.fail("Failed to create organization");
    throw new Error(`Create org error: ${orgError?.message}`);
  }

  // Link org to user if email provided
  if (opts.userEmail) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", opts.userEmail)
      .single();

    if (profileError || !profile) {
      spinner.warn(
        `Created org but could not find profile for ${opts.userEmail}. ` +
          `Make sure to log in first, then re-run.`
      );
    } else {
      // Set user as org_admin for this org (or keep super_admin if already)
      const newRole = profile.role === "super_admin" ? "super_admin" : "org_admin";
      await supabase
        .from("profiles")
        .update({ organization_id: orgData.id, role: newRole })
        .eq("id", profile.id);

      spinner.succeed(
        `Created org: ${chalk.bold(org.name)} (${orgData.id})\n` +
          `  Country: ${org.country}, Industry: ${org.industry}\n` +
          `  Employees: ${org.employee_count}, Departments: ${org.departments.length}\n` +
          `  Depts: ${org.departments.map((d) => `${d.name}(${d.headcount})`).join(", ")}\n` +
          `  Linked to: ${chalk.cyan(opts.userEmail)} (${newRole})`
      );
      return { orgId: orgData.id, org };
    }
  }

  spinner.succeed(
    `Created org: ${chalk.bold(org.name)} (${orgData.id})\n` +
      `  Country: ${org.country}, Industry: ${org.industry}\n` +
      `  Employees: ${org.employee_count}, Departments: ${org.departments.length}\n` +
      `  Depts: ${org.departments.map((d) => `${d.name}(${d.headcount})`).join(", ")}`
  );

  return { orgId: orgData.id, org };
}

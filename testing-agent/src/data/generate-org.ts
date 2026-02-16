import { faker } from "@faker-js/faker/locale/es";
import { DEPARTMENT_POOL, LATAM_COUNTRIES, INDUSTRIES } from "./constants.js";

export interface GeneratedOrg {
  name: string;
  country: string;
  industry: string;
  employee_count: number;
  departments: { name: string; headcount: number }[];
}

export function generateOrg(opts: {
  name?: string;
  employeeCount?: number;
  departmentCount?: number;
}): GeneratedOrg {
  const employeeCount = opts.employeeCount ?? faker.number.int({ min: 50, max: 300 });
  const deptCount = opts.departmentCount ?? faker.number.int({ min: 5, max: 8 });

  // Pick departments
  const shuffled = faker.helpers.shuffle([...DEPARTMENT_POOL]);
  const deptNames = shuffled.slice(0, deptCount);

  // Distribute headcount proportionally with random weights
  const weights = deptNames.map(() => faker.number.float({ min: 0.5, max: 2.0 }));
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let remaining = employeeCount;
  const departments = deptNames.map((name, i) => {
    const headcount =
      i === deptNames.length - 1
        ? remaining
        : Math.max(3, Math.round((weights[i] / totalWeight) * employeeCount));
    remaining -= headcount;
    return { name, headcount };
  });

  // Fix any negative from rounding
  if (departments[departments.length - 1].headcount < 3) {
    departments[departments.length - 1].headcount = 3;
  }

  return {
    name: opts.name ?? `${faker.company.name()} Test`,
    country: faker.helpers.arrayElement(LATAM_COUNTRIES),
    industry: faker.helpers.arrayElement(INDUSTRIES),
    employee_count: employeeCount,
    departments,
  };
}

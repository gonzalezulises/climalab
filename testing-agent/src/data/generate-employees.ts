import { faker } from "@faker-js/faker/locale/es";
import { TENURES, TENURE_WEIGHTS, GENDERS, GENDER_WEIGHTS } from "./constants.js";

export interface GeneratedEmployee {
  department: string;
  tenure: string;
  gender: string;
  name: string;
  email: string;
}

function weightedPick<T>(options: readonly T[], weights: readonly number[]): T {
  const r = faker.number.float({ min: 0, max: 1 });
  let acc = 0;
  for (let i = 0; i < options.length; i++) {
    acc += weights[i];
    if (r < acc) return options[i];
  }
  return options[options.length - 1];
}

export function generateEmployees(
  count: number,
  departments: { name: string; headcount: number }[]
): GeneratedEmployee[] {
  const employees: GeneratedEmployee[] = [];
  const totalHeadcount = departments.reduce((s, d) => s + d.headcount, 0);
  const deptWeights = departments.map((d) => d.headcount / totalHeadcount);
  const deptNames = departments.map((d) => d.name);

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    employees.push({
      department: weightedPick(deptNames, deptWeights),
      tenure: weightedPick(TENURES, TENURE_WEIGHTS),
      gender: weightedPick(GENDERS, GENDER_WEIGHTS),
      name: `${firstName} ${lastName}`,
      email: faker.internet
        .email({ firstName, lastName, provider: "test.climalab.app" })
        .toLowerCase(),
    });
  }

  return employees;
}

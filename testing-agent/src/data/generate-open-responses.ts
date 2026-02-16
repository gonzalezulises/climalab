import { faker } from "@faker-js/faker/locale/es";

const STRENGTH_COMMENTS = [
  "El liderazgo de mi supervisor es excepcional, siempre está disponible para apoyarnos.",
  "Me siento muy orgulloso de trabajar aquí, es una empresa con valores sólidos.",
  "La colaboración entre equipos es una de las mayores fortalezas de la organización.",
  "Valoro mucho la autonomía que me dan para realizar mi trabajo.",
  "El ambiente laboral es muy positivo y los compañeros son solidarios.",
  "La comunicación dentro del equipo es clara y efectiva.",
  "Se nota un compromiso genuino con el desarrollo profesional de los colaboradores.",
  "El propósito de nuestro trabajo está bien definido y me motiva diariamente.",
  "La empresa invierte en tecnología y herramientas que facilitan nuestro trabajo.",
  "El respeto y la inclusión son valores que se viven día a día.",
  "Las políticas de balance vida-trabajo son un gran diferenciador.",
  "Siento que mi opinión es valorada en las decisiones del equipo.",
  "El programa de reconocimiento nos motiva a dar lo mejor.",
  "La cultura de innovación nos permite proponer ideas sin temor.",
  "Los beneficios complementarios son competitivos y bien pensados.",
  "Mi jefe directo es un modelo de liderazgo participativo.",
  "La empresa demuestra coherencia entre lo que dice y lo que hace.",
  "El sentido de pertenencia es muy fuerte en esta organización.",
  "Se promueve activamente el aprendizaje continuo.",
  "La seguridad en el trabajo es una prioridad real, no solo en papel.",
];

const IMPROVEMENT_COMMENTS = [
  "La compensación debería ser más competitiva respecto al mercado.",
  "Necesitamos más oportunidades de desarrollo y capacitación.",
  "La comunicación interna podría mejorar, a veces nos enteramos tarde de cambios importantes.",
  "Los procesos de promoción no siempre son transparentes.",
  "Sería bueno tener más flexibilidad para el balance vida-trabajo.",
  "La carga de trabajo es excesiva en ciertos periodos del año.",
  "Faltan espacios formales de retroalimentación con los jefes directos.",
  "Los beneficios no han sido actualizados en mucho tiempo.",
  "La tecnología que usamos está desactualizada en algunos departamentos.",
  "No hay suficiente claridad en los criterios de evaluación de desempeño.",
  "Las decisiones a veces se toman sin consultar a los equipos afectados.",
  "Necesitamos invertir más en la capacitación de mandos medios.",
  "La rotación en algunos departamentos es preocupante.",
  "Falta un plan de carrera claro para posiciones técnicas.",
  "El proceso de onboarding podría ser más estructurado.",
  "Hay favoritismo en la asignación de proyectos interesantes.",
  "La infraestructura de las oficinas necesita mejoras.",
  "Se debería reconocer más el trabajo de los equipos de soporte.",
  "Las reuniones son excesivas y muchas podrían ser un correo.",
  "Necesitamos mayor diversidad en los niveles de liderazgo.",
];

const GENERAL_COMMENTS = [
  "En general estoy satisfecho con mi experiencia en la empresa.",
  "Creo que vamos por buen camino pero hay áreas claras de mejora.",
  "Me gustaría que se implementaran más iniciativas de bienestar.",
  "La empresa ha mejorado mucho en el último año.",
  "Espero que los resultados de esta encuesta se traduzcan en acciones concretas.",
  "Es una empresa donde se puede crecer profesionalmente con esfuerzo.",
  "Aprecio la estabilidad que ofrece la organización.",
  "Me gustaría ver más cambios positivos en los próximos meses.",
  "La cultura organizacional tiene fortalezas pero también puntos ciegos.",
  "Recomendaría esta empresa a conocidos con algunas reservas.",
  "Es importante que se actúe sobre el feedback que estamos dando.",
  "El último trimestre fue especialmente desafiante para nuestro equipo.",
  "Confío en la dirección estratégica de la empresa.",
  "La pandemia cambió mucho la dinámica y aún estamos ajustándonos.",
  "Me siento parte de algo significativo al trabajar aquí.",
  "Sería valioso ver los resultados de esta encuesta y el plan de acción.",
  "La empresa tiene un gran potencial si logra retener al talento clave.",
  "En comparación con mi empleo anterior, esta empresa es mucho mejor.",
  "Se necesita más comunicación sobre la visión a largo plazo.",
  "Agradezco la oportunidad de expresar mi opinión de forma anónima.",
];

export interface GeneratedOpenResponse {
  question_type: "strength" | "improvement" | "general";
  text: string;
}

export function generateOpenResponses(count: number): GeneratedOpenResponse[] {
  const responses: GeneratedOpenResponse[] = [];
  const types: ("strength" | "improvement" | "general")[] = ["strength", "improvement", "general"];

  for (let i = 0; i < count; i++) {
    const type = faker.helpers.arrayElement(types);
    let pool: string[];
    switch (type) {
      case "strength":
        pool = STRENGTH_COMMENTS;
        break;
      case "improvement":
        pool = IMPROVEMENT_COMMENTS;
        break;
      case "general":
        pool = GENERAL_COMMENTS;
        break;
    }
    responses.push({
      question_type: type,
      text: faker.helpers.arrayElement(pool),
    });
  }

  return responses;
}

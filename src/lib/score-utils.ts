/**
 * Centralized score classification and color utilities for results module.
 * Colors aligned with Rizoma design system.
 */

export function classifyFavorability(fav: number) {
  if (fav >= 90)
    return { label: "Excepcional", color: "#289448", bg: "bg-green-100 text-green-800" };
  if (fav >= 80) return { label: "Sólida", color: "#1FACC0", bg: "bg-cyan-100 text-cyan-800" };
  if (fav >= 70) return { label: "Aceptable", color: "#2F5DFF", bg: "bg-blue-100 text-blue-800" };
  if (fav >= 60)
    return { label: "Atención", color: "#FF8044", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Crisis", color: "#C32421", bg: "bg-red-100 text-red-800" };
}

export function favToHex(fav: number): string {
  if (fav >= 90) return "#289448";
  if (fav >= 80) return "#1FACC0";
  if (fav >= 70) return "#2F5DFF";
  if (fav >= 60) return "#FF8044";
  return "#C32421";
}

export const SEVERITY_LABELS: Record<string, { label: string; bg: string }> = {
  crisis: { label: "Crisis", bg: "bg-red-600 text-white" },
  attention: { label: "Atención", bg: "bg-yellow-500 text-white" },
  risk_group: { label: "Grupo de riesgo", bg: "bg-orange-500 text-white" },
  decline: { label: "Declive", bg: "bg-purple-500 text-white" },
};

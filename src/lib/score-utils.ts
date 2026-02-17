/**
 * Centralized score classification and color utilities for results module.
 */

export function classifyFavorability(fav: number) {
  if (fav >= 90)
    return { label: "Excepcional", color: "#1dc47c", bg: "bg-green-100 text-green-800" };
  if (fav >= 80) return { label: "Sólida", color: "#00B4D8", bg: "bg-cyan-100 text-cyan-800" };
  if (fav >= 70) return { label: "Aceptable", color: "#0052CC", bg: "bg-blue-100 text-blue-800" };
  if (fav >= 60)
    return { label: "Atención", color: "#F59E0B", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Crisis", color: "#DC2626", bg: "bg-red-100 text-red-800" };
}

export function favToHex(fav: number): string {
  if (fav >= 90) return "#1dc47c";
  if (fav >= 80) return "#00B4D8";
  if (fav >= 70) return "#0052CC";
  if (fav >= 60) return "#F59E0B";
  return "#DC2626";
}

export const SEVERITY_LABELS: Record<string, { label: string; bg: string }> = {
  crisis: { label: "Crisis", bg: "bg-red-600 text-white" },
  attention: { label: "Atención", bg: "bg-yellow-500 text-white" },
  risk_group: { label: "Grupo de riesgo", bg: "bg-orange-500 text-white" },
  decline: { label: "Declive", bg: "bg-purple-500 text-white" },
};

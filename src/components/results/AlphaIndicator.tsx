import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

type AlphaStatus = "calculated" | "insufficient_n" | "insufficient_items" | "zero_variance";

interface AlphaIndicatorProps {
  alpha: number | null;
  status: AlphaStatus;
  n: number;
  k: number;
  compact?: boolean;
}

function getQuality(value: number) {
  if (value >= 0.8) return { label: "Alta", className: "bg-green-100 text-green-800" };
  if (value >= 0.7) return { label: "Aceptable", className: "bg-green-100 text-green-700" };
  if (value >= 0.6) return { label: "Cuestionable", className: "bg-amber-100 text-amber-800" };
  return { label: "Baja", className: "bg-red-100 text-red-800" };
}

function getTooltipText(props: AlphaIndicatorProps): string {
  if (props.status === "insufficient_n") {
    return `Confiabilidad no calculable: se requieren al menos 10 respondentes. Este grupo tiene ${props.n}.`;
  }
  if (props.status === "insufficient_items") {
    return `Se requieren al menos 2 ítems para calcular la confiabilidad.`;
  }
  if (props.status === "zero_variance") {
    return `Todos los respondentes dieron el mismo valor en todos los ítems de esta dimensión.`;
  }
  // calculated
  const v = props.alpha!;
  if (v >= 0.8) return `Confiabilidad alta (α=${v.toFixed(3)}). N=${props.n}, k=${props.k} ítems.`;
  if (v >= 0.7)
    return `Confiabilidad aceptable (α=${v.toFixed(3)}). N=${props.n}, k=${props.k} ítems.`;
  if (v >= 0.6) return `Confiabilidad cuestionable (α=${v.toFixed(3)}). Interpretar con cautela.`;
  return `Confiabilidad baja (α=${v.toFixed(3)}). Los ítems de esta dimensión no son consistentes entre sí.`;
}

export function AlphaIndicator({ alpha, status, n, k, compact = false }: AlphaIndicatorProps) {
  const tooltipText = getTooltipText({ alpha, status, n, k });

  if (status !== "calculated" || alpha === null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {compact ? (
              <span className="text-muted-foreground cursor-help">—</span>
            ) : (
              <Badge variant="outline" className="bg-gray-100 text-gray-500 cursor-help">
                n insuficiente
              </Badge>
            )}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const quality = getQuality(alpha);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {compact ? (
            <span className="font-mono cursor-help">{alpha.toFixed(3)}</span>
          ) : (
            <div className="flex items-center gap-2 cursor-help">
              <span className="font-mono">{alpha.toFixed(3)}</span>
              <Badge className={quality.className}>{quality.label}</Badge>
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

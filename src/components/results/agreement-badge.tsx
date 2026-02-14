"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AgreementBadge({ rwg }: { rwg: number }) {
  if (rwg >= 0.7) return null;

  const isLow = rwg < 0.5;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={
              isLow
                ? "border-red-300 bg-red-50 text-red-700 text-[10px] px-1"
                : "border-yellow-300 bg-yellow-50 text-yellow-700 text-[10px] px-1"
            }
          >
            {isLow ? "Disperso" : "Heterogéneo"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {isLow
            ? "Percepciones muy dispersas — este promedio no representa una percepción compartida"
            : "Percepciones moderadamente heterogéneas"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

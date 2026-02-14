"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  subtitle?: string;
  className?: string;
}

export function KpiCard({ label, value, delta, subtitle, className }: KpiCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <CardContent className="flex flex-col gap-1 p-0">
        <span className="text-muted-foreground text-sm font-medium">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {delta !== undefined && (
            <span
              className={cn(
                "text-sm font-semibold",
                delta >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}
            </span>
          )}
        </div>
        {subtitle && <span className="text-muted-foreground text-xs">{subtitle}</span>}
      </CardContent>
    </Card>
  );
}

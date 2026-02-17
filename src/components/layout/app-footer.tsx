import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const COPYRIGHT = "© 2026 Rizo.ma — ClimaLab es marca propiedad de Prozess Group S.A.";

const DISCLAIMER =
  "Los resultados e insights generados por ClimaLab, incluyendo análisis estadísticos e interpretaciones de IA, son de carácter informativo y no constituyen asesoría profesional, legal ni psicológica. Las decisiones organizacionales deben complementarse con juicio profesional calificado.";

export function AppFooter({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="px-2 py-1.5 text-[10px] leading-tight text-muted-foreground/60 cursor-default">
              {COPYRIGHT}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {DISCLAIMER}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
        <p>{COPYRIGHT}</p>
        <p className="mt-2 text-xs text-muted-foreground/70">{DISCLAIMER}</p>
      </div>
    </footer>
  );
}

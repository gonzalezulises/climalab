"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Error en resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Ocurrio un error al cargar los resultados de esta campana. Por favor, intenta
            nuevamente.
          </p>
          {error.message && (
            <p className="text-muted-foreground mt-2 text-xs font-mono break-all">
              {error.message}
            </p>
          )}
          {error.digest && (
            <p className="text-muted-foreground mt-1 text-xs">Codigo: {error.digest}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={reset}>Reintentar</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

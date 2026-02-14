"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SurveyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Algo salio mal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Ocurrio un error al cargar la encuesta. Por favor, actualiza la pagina para intentar
            nuevamente.
          </p>
          {error.digest && (
            <p className="text-muted-foreground mt-2 text-xs">Codigo: {error.digest}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={reset}>Actualizar pagina</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

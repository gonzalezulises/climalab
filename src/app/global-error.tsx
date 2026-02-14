"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Error inesperado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Ocurrio un error inesperado en la aplicacion. Por favor, intenta nuevamente.
              </p>
              {error.digest && (
                <p className="text-muted-foreground mt-2 text-xs">Codigo: {error.digest}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={reset}>Reintentar</Button>
            </CardFooter>
          </Card>
        </div>
      </body>
    </html>
  );
}

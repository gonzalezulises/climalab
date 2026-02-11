import Link from "next/link";
import { getInstruments } from "@/actions/instruments";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { INSTRUMENT_MODES } from "@/lib/constants";

export default async function InstrumentsPage() {
  const result = await getInstruments();
  const instruments = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Instrumentos</h1>
        <p className="text-muted-foreground">
          Instrumentos de medicion de clima organizacional
        </p>
      </div>

      {instruments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay instrumentos registrados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {instruments.map((instrument) => (
            <Link
              key={instrument.id}
              href={`/instruments/${instrument.id}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{instrument.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        v{instrument.version}
                      </Badge>
                      <Badge
                        variant={
                          instrument.mode === "full" ? "default" : "secondary"
                        }
                      >
                        {INSTRUMENT_MODES[instrument.mode]}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{instrument.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge
                      variant={instrument.is_active ? "default" : "destructive"}
                    >
                      {instrument.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

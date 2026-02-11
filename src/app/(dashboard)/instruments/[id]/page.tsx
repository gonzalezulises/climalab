import { notFound } from "next/navigation";
import { getInstrumentWithItems } from "@/actions/instruments";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { INSTRUMENT_MODES } from "@/lib/constants";
import { ChevronDown } from "lucide-react";
import { EditItemDialog } from "./edit-item-dialog";

export default async function InstrumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInstrumentWithItems(id);

  if (!result.success) {
    notFound();
  }

  const instrument = result.data;
  const totalItems = instrument.dimensions.reduce(
    (sum, dim) => sum + dim.items.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {instrument.name}
          </h1>
          <Badge variant="outline">v{instrument.version}</Badge>
          <Badge
            variant={instrument.mode === "full" ? "default" : "secondary"}
          >
            {INSTRUMENT_MODES[instrument.mode]}
          </Badge>
        </div>
        <p className="text-muted-foreground">{instrument.description}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {instrument.dimensions.length} dimensiones, {totalItems} items
        </p>
      </div>

      <div className="space-y-3">
        {instrument.dimensions.map((dimension) => (
          <Collapsible key={dimension.id} defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{dimension.code}</Badge>
                      <CardTitle className="text-base">
                        {dimension.name}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        ({dimension.items.length} items)
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  </div>
                  {dimension.description && (
                    <CardDescription className="text-left">
                      {dimension.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Texto</TableHead>
                        <TableHead className="w-32">Tipo</TableHead>
                        <TableHead className="w-20">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dimension.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">
                            {item.sort_order}
                          </TableCell>
                          <TableCell>{item.text}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {item.is_reverse && (
                                <Badge variant="destructive" className="text-xs">
                                  R
                                </Badge>
                              )}
                              {item.is_anchor && (
                                <Badge variant="secondary" className="text-xs">
                                  A
                                </Badge>
                              )}
                              {item.is_attention_check && (
                                <Badge variant="outline" className="text-xs">
                                  V
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <EditItemDialog item={item} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

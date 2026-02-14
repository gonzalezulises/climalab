"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { SEGMENT_TYPE_LABELS } from "@/lib/constants";

type Props = {
  availableSegments: { department: string[]; tenure: string[]; gender: string[] };
};

export function SegmentFilterBar({ availableSegments }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSegmentType = searchParams.get("segment_type");
  const currentSegmentKey = searchParams.get("segment_key");

  function updateParams(segType: string | null, segKey: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (segType && segKey) {
      params.set("segment_type", segType);
      params.set("segment_key", segKey);
    } else {
      params.delete("segment_type");
      params.delete("segment_key");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const segmentTypeOptions = (
    Object.entries(availableSegments) as [keyof typeof availableSegments, string[]][]
  ).filter(([, keys]) => keys.length > 0);

  const currentKeys =
    currentSegmentType && currentSegmentType in availableSegments
      ? availableSegments[currentSegmentType as keyof typeof availableSegments]
      : [];

  const hasFilter = currentSegmentType && currentSegmentKey;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 print:hidden">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground shrink-0">Filtrar por:</span>

      <Select
        value={currentSegmentType ?? ""}
        onValueChange={(val) => {
          if (val === "") {
            updateParams(null, null);
          } else {
            const keys = availableSegments[val as keyof typeof availableSegments] ?? [];
            updateParams(val, keys[0] ?? null);
          }
        }}
      >
        <SelectTrigger className="w-[160px] h-8 text-sm">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos</SelectItem>
          {segmentTypeOptions.map(([type]) => (
            <SelectItem key={type} value={type}>
              {SEGMENT_TYPE_LABELS[type] ?? type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentSegmentType && currentKeys.length > 0 && (
        <Select
          value={currentSegmentKey ?? ""}
          onValueChange={(val) => updateParams(currentSegmentType, val)}
        >
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {currentKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilter && (
        <>
          <Badge variant="secondary" className="text-xs">
            {SEGMENT_TYPE_LABELS[currentSegmentType] ?? currentSegmentType}: {currentSegmentKey}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => updateParams(null, null)}
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
        </>
      )}
    </div>
  );
}

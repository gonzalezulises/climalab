"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type Props = {
  data: Record<string, unknown>[];
  filename: string;
  columns?: Record<string, string>;
};

export function CsvDownloadButton({ data, filename, columns }: Props) {
  function download() {
    if (data.length === 0) return;

    const keys = columns ? Object.keys(columns) : Object.keys(data[0]);
    const headers = columns ? Object.values(columns) : keys;

    const rows = data.map((row) =>
      keys
        .map((k) => {
          const val = row[k];
          const str = val == null ? "" : String(val);
          // Escape CSV: quote if contains comma, quote, or newline
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download} disabled={data.length === 0}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      CSV
    </Button>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton() {
  const handleExport = () => {
    window.print();
  };

  return (
    <Button variant="outline" onClick={handleExport} className="print:hidden">
      <Download className="mr-2 h-4 w-4" />
      Exportar PDF
    </Button>
  );
}

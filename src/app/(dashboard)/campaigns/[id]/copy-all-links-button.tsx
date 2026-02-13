"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyAllLinksButton({ links }: { links: string[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = links.join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <><Check className="mr-1 h-4 w-4" /> Copiados ({links.length})</>
      ) : (
        <><Copy className="mr-1 h-4 w-4" /> Copiar todos</>
      )}
    </Button>
  );
}

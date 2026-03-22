"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Link } from "lucide-react";

export function PublicLinkCard({ campaignId, baseUrl }: { campaignId: string; baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${baseUrl}/survey/campaign/${campaignId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link className="h-4 w-4" />
          Enlace público de encuesta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Comparte este enlace por email, WhatsApp o código QR. Cada persona que lo abra recibirá su
          propia encuesta anónima.
        </p>
        <div className="flex gap-2">
          <Input value={publicUrl} readOnly className="font-mono text-sm" />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

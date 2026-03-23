"use client";

import { useState, useEffect } from "react";
import { getTallyFormUrl } from "@/actions/tally";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Link, ExternalLink } from "lucide-react";

export function PublicLinkCard({ campaignId }: { campaignId: string }) {
  const [copied, setCopied] = useState(false);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTallyFormUrl(campaignId).then((result) => {
      if (result.success && result.data) {
        setFormUrl(result.data.formUrl);
      }
      setLoading(false);
    });
  }, [campaignId]);

  const handleCopy = async () => {
    if (!formUrl) return;
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="h-4 w-4" />
            Enlace de encuesta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!formUrl) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link className="h-4 w-4" />
          Enlace de encuesta (Tally)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Comparte este enlace por email, WhatsApp o código QR. Cada respuesta se procesa
          automáticamente en ClimaLab.
        </p>
        <div className="flex gap-2">
          <Input value={formUrl} readOnly className="font-mono text-sm" />
          <Button variant="outline" size="icon" onClick={handleCopy} title="Copiar enlace">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" asChild title="Abrir en Tally">
            <a href={formUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

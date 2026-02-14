"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { analyzeComments } from "@/actions/ai-insights";
import type { CommentAnalysis } from "@/actions/ai-insights";

type Comment = { question_type: string; text: string };

const typeConfig: Record<string, { label: string; color: string; border: string }> = {
  strength: { label: "Fortalezas", color: "bg-green-100 text-green-800", border: "border-l-green-500" },
  improvement: { label: "Áreas de mejora", color: "bg-yellow-100 text-yellow-800", border: "border-l-yellow-500" },
  general: { label: "General", color: "bg-blue-100 text-blue-800", border: "border-l-blue-500" },
};

const sentimentColors: Record<string, string> = {
  positive: "bg-green-100 text-green-800",
  negative: "bg-red-100 text-red-800",
  neutral: "bg-gray-100 text-gray-800",
};

const sentimentLabels: Record<string, string> = {
  positive: "Positivo",
  negative: "Negativo",
  neutral: "Neutral",
};

export function CommentsClient({
  campaignId,
  comments,
  initialAnalysis,
}: {
  campaignId: string;
  comments: Comment[];
  initialAnalysis: CommentAnalysis | null;
}) {
  const [analysis, setAnalysis] = useState<CommentAnalysis | null>(initialAnalysis);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const grouped: Record<string, Comment[]> = { strength: [], improvement: [], general: [] };
  for (const c of comments) {
    if (grouped[c.question_type]) grouped[c.question_type].push(c);
    else grouped.general.push(c);
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await analyzeComments(campaignId);
      if (result.success) {
        setAnalysis(result.data);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Comentarios Abiertos</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{comments.length} comentarios</Badge>
          {comments.length > 0 && (
            <Button
              size="sm"
              variant={analysis ? "outline" : "default"}
              onClick={handleGenerate}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {analysis ? "Regenerar análisis" : "Analizar con IA"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="space-y-4">
          {/* Sentiment distribution */}
          <div className="grid gap-4 md:grid-cols-3">
            {(["positive", "negative", "neutral"] as const).map((s) => (
              <Card key={s}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{sentimentLabels[s]}</p>
                  <p className="text-2xl font-bold">{analysis.sentiment_distribution[s]}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-200">
                    <div
                      className={`h-1.5 rounded-full ${s === "positive" ? "bg-green-500" : s === "negative" ? "bg-red-500" : "bg-gray-400"}`}
                      style={{ width: `${comments.length > 0 ? (analysis.sentiment_distribution[s] / comments.length) * 100 : 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Summary */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Resumen IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.summary.strengths && (
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">Fortalezas</p>
                  <p className="text-sm">{analysis.summary.strengths}</p>
                </div>
              )}
              {analysis.summary.improvements && (
                <div>
                  <p className="text-xs font-medium text-yellow-700 mb-1">Áreas de mejora</p>
                  <p className="text-sm">{analysis.summary.improvements}</p>
                </div>
              )}
              {analysis.summary.general && (
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1">General</p>
                  <p className="text-sm">{analysis.summary.general}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Themes */}
          {analysis.themes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Temas identificados</CardTitle>
                <CardDescription>{analysis.themes.length} temas extraídos de los comentarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.themes.map((theme, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{theme.theme}</p>
                          <Badge variant="outline" className="text-xs">{theme.count} menciones</Badge>
                          <Badge className={sentimentColors[theme.sentiment]}>
                            {sentimentLabels[theme.sentiment]}
                          </Badge>
                        </div>
                        {theme.examples.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {theme.examples.map((ex, j) => (
                              <p key={j} className="text-xs text-muted-foreground italic">&quot;{ex}&quot;</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Original comments */}
      <Tabs defaultValue="strength">
        <TabsList>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key}>
              {cfg.label} ({grouped[key]?.length ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(typeConfig).map(([key, cfg]) => (
          <TabsContent key={key} value={key} className="mt-4">
            {(grouped[key]?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm">No hay comentarios de este tipo.</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {grouped[key].map((c, i) => (
                  <Card key={i} className={`border-l-4 ${cfg.border}`}>
                    <CardContent className="py-3">
                      <p className="text-sm">{c.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

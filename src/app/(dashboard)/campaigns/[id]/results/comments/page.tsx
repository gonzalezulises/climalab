import { notFound } from "next/navigation";
import { getCampaign, getOpenResponses } from "@/actions/campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const typeConfig: Record<string, { label: string; color: string; border: string }> = {
  strength: { label: "Fortalezas", color: "bg-green-100 text-green-800", border: "border-l-green-500" },
  improvement: { label: "Áreas de mejora", color: "bg-yellow-100 text-yellow-800", border: "border-l-yellow-500" },
  general: { label: "General", color: "bg-blue-100 text-blue-800", border: "border-l-blue-500" },
};

export default async function CommentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, openResult] = await Promise.all([
    getCampaign(id),
    getOpenResponses(id),
  ]);

  if (!campaignResult.success) notFound();
  const comments = openResult.success ? openResult.data : [];

  const grouped: Record<string, typeof comments> = { strength: [], improvement: [], general: [] };
  for (const c of comments) {
    if (grouped[c.question_type]) grouped[c.question_type].push(c);
    else grouped.general.push(c);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Comentarios Abiertos</h1>
        <Badge variant="outline">{comments.length} comentarios</Badge>
      </div>

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

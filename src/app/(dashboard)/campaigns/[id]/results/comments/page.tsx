import { notFound } from "next/navigation";
import { getCampaign, getOpenResponses } from "@/actions/campaigns";
import { getCommentAnalysis } from "@/actions/ai-insights";
import { CommentsClient } from "./comments-client";

export default async function CommentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, openResult, analysisResult] = await Promise.all([
    getCampaign(id),
    getOpenResponses(id),
    getCommentAnalysis(id),
  ]);

  if (!campaignResult.success) notFound();
  const comments = openResult.success ? openResult.data : [];
  const analysis = analysisResult.success ? analysisResult.data : null;

  return (
    <CommentsClient
      campaignId={id}
      comments={comments.map((c) => ({ question_type: c.question_type, text: c.text }))}
      initialAnalysis={analysis}
    />
  );
}

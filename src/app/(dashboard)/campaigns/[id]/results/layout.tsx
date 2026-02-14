import { getCampaign } from "@/actions/campaigns";
import { notFound } from "next/navigation";
import { ResultsSidebar } from "./results-nav";

export default async function ResultsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCampaign(id);
  if (!result.success) notFound();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <ResultsSidebar campaignId={id} campaignName={result.data.name} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}

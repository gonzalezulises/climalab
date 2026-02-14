import { Suspense } from "react";
import { getCampaign } from "@/actions/campaigns";
import { getAvailableSegments } from "@/actions/analytics";
import { notFound } from "next/navigation";
import { ResultsSidebar } from "./results-nav";
import { SegmentFilterBar } from "@/components/results/segment-filter-bar";

export default async function ResultsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, segmentsResult] = await Promise.all([getCampaign(id), getAvailableSegments(id)]);
  if (!result.success) notFound();

  const availableSegments = segmentsResult.success
    ? segmentsResult.data
    : { department: [], tenure: [], gender: [] };

  const hasSegments =
    availableSegments.department.length > 0 ||
    availableSegments.tenure.length > 0 ||
    availableSegments.gender.length > 0;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <ResultsSidebar campaignId={id} campaignName={result.data.name} />
      <div className="flex-1 flex flex-col overflow-auto">
        {hasSegments && (
          <div className="px-6 pt-4">
            <Suspense>
              <SegmentFilterBar availableSegments={availableSegments} />
            </Suspense>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

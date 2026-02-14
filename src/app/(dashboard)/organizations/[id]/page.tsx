import { notFound } from "next/navigation";
import { getOrganization } from "@/actions/organizations";
import { getCampaigns } from "@/actions/campaigns";
import { OrganizationDetail } from "./organization-detail";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getOrganization(id);

  if (!result.success) {
    notFound();
  }

  const campaignsResult = await getCampaigns(id);
  const campaigns = campaignsResult.success ? campaignsResult.data : [];

  return <OrganizationDetail org={result.data} campaigns={campaigns} />;
}

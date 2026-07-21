export interface SponsoredCampaign {
  id: string;
  brandName: string;
  productId: string;
  budgetCents: number;
  startDate: string;
  endDate: string;
  status: "active" | "paused" | "completed";
}

const campaigns: SponsoredCampaign[] = [];

export async function createCampaign(input: Omit<SponsoredCampaign, "id">): Promise<SponsoredCampaign> {
  const campaign: SponsoredCampaign = { ...input, id: `camp_${Date.now()}` };
  campaigns.push(campaign);
  return campaign;
}

export async function listCampaigns(): Promise<SponsoredCampaign[]> {
  return campaigns;
}

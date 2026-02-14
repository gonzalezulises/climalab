import type { Database } from "./database";

// Table row types
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
export type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Instrument = Database["public"]["Tables"]["instruments"]["Row"];
export type InstrumentInsert = Database["public"]["Tables"]["instruments"]["Insert"];

export type Dimension = Database["public"]["Tables"]["dimensions"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type ItemUpdate = Database["public"]["Tables"]["items"]["Update"];

export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
export type Respondent = Database["public"]["Tables"]["respondents"]["Row"];
export type Response = Database["public"]["Tables"]["responses"]["Row"];
export type OpenResponse = Database["public"]["Tables"]["open_responses"]["Row"];
export type CampaignResult = Database["public"]["Tables"]["campaign_results"]["Row"];
export type CampaignAnalytics = Database["public"]["Tables"]["campaign_analytics"]["Row"];

export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type ParticipantInsert = Database["public"]["Tables"]["participants"]["Insert"];

export type BusinessIndicator = Database["public"]["Tables"]["business_indicators"]["Row"];
export type BusinessIndicatorInsert = Database["public"]["Tables"]["business_indicators"]["Insert"];

// Enum types
export type SizeCategory = Database["public"]["Enums"]["size_category"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type InstrumentMode = Database["public"]["Enums"]["instrument_mode"];
export type TargetSize = Database["public"]["Enums"]["target_size"];
export type CampaignStatus = Database["public"]["Enums"]["campaign_status"];

// Composite types for queries
export type InstrumentWithDimensions = Instrument & {
  dimensions: (Dimension & { items: Item[] })[];
};

// Department type (for jsonb departments column)
export type Department = { name: string; headcount: number | null };

// Action result type
export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

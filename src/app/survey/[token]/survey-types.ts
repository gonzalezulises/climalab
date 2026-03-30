export type SurveyItem = {
  id: string;
  text: string;
  is_reverse: boolean;
  is_attention_check: boolean;
  sort_order: number;
};

export type SurveyDimension = {
  id: string;
  code: string;
  name: string;
  items: SurveyItem[];
};

export type SurveyStep = "welcome" | "demographics" | `dimension-${number}` | "open" | "thanks";

export type SurveyClientProps = {
  token: string;
  respondentId: string;
  campaignId: string;
  organizationName: string;
  logoUrl: string | null;
  brandConfig: Record<string, unknown>;
  departments: string[];
  allowComments: boolean;
  dimensions: SurveyDimension[];
  existingResponses: { item_id: string; score: number }[];
  respondentStatus: string;
  respondentDemographics: {
    department: string | null;
    tenure: string | null;
    gender: string | null;
  };
};

export const TENURE_OPTIONS = [
  { value: "<1", label: "Menos de 1 año" },
  { value: "1-3", label: "1-3 años" },
  { value: "3-5", label: "3-5 años" },
  { value: "5-10", label: "5-10 años" },
  { value: "10+", label: "Más de 10 años" },
] as const;

export const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
  { value: "prefer_not_to_say", label: "Prefiero no decir" },
] as const;

export const LIKERT_LABELS = [
  { value: 1, label: "Totalmente en desacuerdo" },
  { value: 2, label: "En desacuerdo" },
  { value: 3, label: "Ni acuerdo ni desacuerdo" },
  { value: 4, label: "De acuerdo" },
  { value: 5, label: "Totalmente de acuerdo" },
] as const;

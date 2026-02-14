import { describe, it, expect } from "vitest";
import { createOrganizationSchema } from "./organization";
import { createCampaignSchema, generateLinksSchema } from "./campaign";
import { updateItemSchema } from "./instrument";
import { createBusinessIndicatorSchema } from "./business-indicator";

const validUuid = "a0000000-0000-0000-0000-000000000001";

describe("createOrganizationSchema", () => {
  const valid = {
    name: "Acme Corp",
    slug: "acme-corp",
    country: "PA",
    employee_count: 50,
  };

  it("accepts valid input", () => {
    expect(createOrganizationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects name too short", () => {
    expect(createOrganizationSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejects slug with invalid chars", () => {
    expect(createOrganizationSchema.safeParse({ ...valid, slug: "Acme Corp!" }).success).toBe(
      false
    );
  });

  it("rejects employee_count of 0", () => {
    expect(createOrganizationSchema.safeParse({ ...valid, employee_count: 0 }).success).toBe(false);
  });

  it("rejects employee_count over 500", () => {
    expect(createOrganizationSchema.safeParse({ ...valid, employee_count: 501 }).success).toBe(
      false
    );
  });

  it("rejects invalid email", () => {
    expect(
      createOrganizationSchema.safeParse({ ...valid, contact_email: "notanemail" }).success
    ).toBe(false);
  });
});

describe("createCampaignSchema", () => {
  const valid = {
    organization_id: validUuid,
    instrument_id: validUuid,
    name: "Q3 2025",
  };

  it("accepts valid input", () => {
    expect(createCampaignSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    expect(
      createCampaignSchema.safeParse({ ...valid, organization_id: "not-a-uuid" }).success
    ).toBe(false);
  });

  it("rejects name too short", () => {
    expect(createCampaignSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejects name too long", () => {
    expect(createCampaignSchema.safeParse({ ...valid, name: "A".repeat(101) }).success).toBe(false);
  });
});

describe("generateLinksSchema", () => {
  it("rejects count of 0", () => {
    expect(generateLinksSchema.safeParse({ campaign_id: validUuid, count: 0 }).success).toBe(false);
  });

  it("rejects count over 1000", () => {
    expect(generateLinksSchema.safeParse({ campaign_id: validUuid, count: 1001 }).success).toBe(
      false
    );
  });
});

describe("updateItemSchema", () => {
  const valid = {
    id: validUuid,
    text: "Este es un ítem válido",
    is_reverse: false,
    is_anchor: false,
    is_attention_check: false,
  };

  it("accepts valid input", () => {
    expect(updateItemSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects text shorter than 5 chars", () => {
    expect(updateItemSchema.safeParse({ ...valid, text: "abc" }).success).toBe(false);
  });

  it("requires boolean fields", () => {
    const { is_reverse, ...rest } = valid;
    void is_reverse;
    expect(updateItemSchema.safeParse(rest).success).toBe(false);
  });
});

describe("createBusinessIndicatorSchema", () => {
  const valid = {
    campaign_id: validUuid,
    indicator_name: "Turnover Rate",
    indicator_value: 12.5,
  };

  it("accepts valid input", () => {
    expect(createBusinessIndicatorSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults indicator_type to custom", () => {
    const result = createBusinessIndicatorSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.indicator_type).toBe("custom");
    }
  });

  it("accepts null for nullish fields", () => {
    expect(
      createBusinessIndicatorSchema.safeParse({
        ...valid,
        indicator_unit: null,
        period_start: null,
        notes: null,
      }).success
    ).toBe(true);
  });
});

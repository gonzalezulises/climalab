/**
 * RLS Isolation Tests — Multi-Tenant Security Verification
 *
 * Tests that Supabase RLS policies correctly isolate data between organizations.
 * Requires local Supabase running (`supabase start && supabase db reset`).
 *
 * Run: npx vitest run supabase/tests/rls-isolation.test.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";
const ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

// Admin client (service_role) — bypasses RLS for setup/teardown
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Authenticated clients for each org (set up in beforeAll)
let clientOrgA: SupabaseClient;
let clientOrgB: SupabaseClient;

// Extended: additional clients for multi-user and orphan tests
let clientA2: SupabaseClient;
let clientA3: SupabaseClient;
let clientOrphan: SupabaseClient;

// Test data IDs
let orgAId: string, orgBId: string;
let campaignAId: string, campaignBId: string;
let userAId: string, userBId: string;
let userA2Id: string, userA3Id: string, userOrphanId: string;
let respondentAId: string, respondentBId: string;
let instrumentId: string;
let openResponseAId: string, openResponseBId: string;

// Extended: scale test IDs
let scaleRespondentIds: string[] = [];
let scaleParticipantIds: string[] = [];

const USER_A_EMAIL = "rls-test-user-a@climalab-test.internal";
const USER_A_PASSWORD = "test-password-alpha-2024!";
const USER_B_EMAIL = "rls-test-user-b@climalab-test.internal";
const USER_B_PASSWORD = "test-password-beta-2024!";
const USER_A2_EMAIL = "rls-test-user-a2@climalab-test.internal";
const USER_A2_PASSWORD = "test-password-alpha2-2024!";
const USER_A3_EMAIL = "rls-test-user-a3@climalab-test.internal";
const USER_A3_PASSWORD = "test-password-alpha3-2024!";
const USER_ORPHAN_EMAIL = "rls-test-orphan@climalab-test.internal";
const USER_ORPHAN_PASSWORD = "test-password-orphan-2024!";

/*
 * Role schema notes (from migration audit):
 *
 * - Roles enum: super_admin | org_admin | member
 * - get_user_org_id() reads profiles.organization_id WHERE id = auth.uid()
 * - A user belongs to exactly ONE organization (or null if unassigned)
 * - No membership table — just profiles.organization_id + profiles.role
 * - member role has no specific policies yet (future)
 * - Users cannot belong to multiple organizations
 */

const SCALE_DEPARTMENTS = [
  "Ventas",
  "Marketing",
  "Tecnología",
  "Finanzas",
  "RRHH",
  "Operaciones",
  "Legal",
  "Servicio al Cliente",
  "Logística",
  "Compras",
  "Calidad",
  "Dirección",
];

async function setupTestData() {
  // 1. Find an active instrument to use for campaigns
  const { data: instruments } = await adminClient
    .from("instruments")
    .select("id")
    .eq("is_active", true)
    .eq("instrument_type", "base")
    .limit(1);

  if (!instruments || instruments.length === 0) {
    throw new Error("No active base instrument found. Run supabase db reset first.");
  }
  instrumentId = instruments[0].id;

  // 2. Create two auth users
  const { data: userA, error: errA } = await adminClient.auth.admin.createUser({
    email: USER_A_EMAIL,
    password: USER_A_PASSWORD,
    email_confirm: true,
  });
  if (errA) throw new Error(`Failed to create user A: ${errA.message}`);
  userAId = userA.user.id;

  const { data: userB, error: errB } = await adminClient.auth.admin.createUser({
    email: USER_B_EMAIL,
    password: USER_B_PASSWORD,
    email_confirm: true,
  });
  if (errB) throw new Error(`Failed to create user B: ${errB.message}`);
  userBId = userB.user.id;

  // 3. Create two organizations
  const { data: orgA, error: orgAErr } = await adminClient
    .from("organizations")
    .insert({
      name: "RLS Test Org Alpha",
      slug: "rls-test-alpha",
      employee_count: 50,
      country: "PA",
      industry: "Tecnología",
      departments: [
        { name: "Engineering", headcount: 25 },
        { name: "Sales", headcount: 25 },
      ],
    })
    .select("id")
    .single();
  if (orgAErr) throw new Error(`Failed to create org A: ${orgAErr.message}`);
  orgAId = orgA.id;

  const { data: orgB, error: orgBErr } = await adminClient
    .from("organizations")
    .insert({
      name: "RLS Test Org Beta",
      slug: "rls-test-beta",
      employee_count: 30,
      country: "PA",
      industry: "Finanzas",
      departments: [
        { name: "Operations", headcount: 15 },
        { name: "HR", headcount: 15 },
      ],
    })
    .select("id")
    .single();
  if (orgBErr) throw new Error(`Failed to create org B: ${orgBErr.message}`);
  orgBId = orgB.id;

  // 4. Update profiles with org assignment and role
  // The trigger `on_auth_user_created` auto-creates profiles, so we update them
  await adminClient
    .from("profiles")
    .update({ organization_id: orgAId, role: "org_admin" })
    .eq("id", userAId);

  await adminClient
    .from("profiles")
    .update({ organization_id: orgBId, role: "org_admin" })
    .eq("id", userBId);

  // 5. Create campaigns (one per org)
  const { data: campA, error: campAErr } = await adminClient
    .from("campaigns")
    .insert({
      organization_id: orgAId,
      instrument_id: instrumentId,
      name: "RLS Test Campaign Alpha",
      status: "active",
    })
    .select("id")
    .single();
  if (campAErr) throw new Error(`Failed to create campaign A: ${campAErr.message}`);
  campaignAId = campA.id;

  const { data: campB, error: campBErr } = await adminClient
    .from("campaigns")
    .insert({
      organization_id: orgBId,
      instrument_id: instrumentId,
      name: "RLS Test Campaign Beta",
      status: "active",
    })
    .select("id")
    .single();
  if (campBErr) throw new Error(`Failed to create campaign B: ${campBErr.message}`);
  campaignBId = campB.id;

  // 6. Create respondents
  const { data: respA } = await adminClient
    .from("respondents")
    .insert({
      campaign_id: campaignAId,
      token: crypto.randomUUID(),
      department: "Engineering",
      status: "completed",
    })
    .select("id")
    .single();
  respondentAId = respA!.id;

  const { data: respB } = await adminClient
    .from("respondents")
    .insert({
      campaign_id: campaignBId,
      token: crypto.randomUUID(),
      department: "Operations",
      status: "completed",
    })
    .select("id")
    .single();
  respondentBId = respB!.id;

  // 7. Create participants (PII)
  await adminClient.from("participants").insert({
    campaign_id: campaignAId,
    respondent_id: respondentAId,
    name: "Alpha Participant",
    email: "alpha-p@test.internal",
  });

  await adminClient.from("participants").insert({
    campaign_id: campaignBId,
    respondent_id: respondentBId,
    name: "Beta Participant",
    email: "beta-p@test.internal",
  });

  // 8. Create open_responses (free-text comments)
  const { data: orA, error: orAErr } = await adminClient
    .from("open_responses")
    .insert({
      respondent_id: respondentAId,
      question_type: "strength",
      text: "Alpha org strength - CONFIDENTIAL",
    })
    .select("id")
    .single();
  if (orAErr) throw new Error(`Failed to create open_response A: ${orAErr.message}`);
  openResponseAId = orA!.id;

  const { data: orB, error: orBErr } = await adminClient
    .from("open_responses")
    .insert({
      respondent_id: respondentBId,
      question_type: "strength",
      text: "Beta org strength - CONFIDENTIAL",
    })
    .select("id")
    .single();
  if (orBErr) throw new Error(`Failed to create open_response B: ${orBErr.message}`);
  openResponseBId = orB!.id;

  // 9. Create campaign_analytics (simulated AI insights)
  await adminClient.from("campaign_analytics").insert({
    campaign_id: campaignAId,
    analysis_type: "dashboard_narrative",
    data: { narrative: "Alpha org insights - CONFIDENTIAL" },
  });

  await adminClient.from("campaign_analytics").insert({
    campaign_id: campaignBId,
    analysis_type: "dashboard_narrative",
    data: { narrative: "Beta org insights - CONFIDENTIAL" },
  });

  // 10. Create campaign_results
  await adminClient.from("campaign_results").insert({
    campaign_id: campaignAId,
    result_type: "dimension",
    dimension_code: "ORG",
    segment_key: "global",
    segment_type: "global",
    avg_score: 4.2,
    std_score: 0.5,
    favorability_pct: 85,
    response_count: 50,
    respondent_count: 50,
  });

  await adminClient.from("campaign_results").insert({
    campaign_id: campaignBId,
    result_type: "dimension",
    dimension_code: "ORG",
    segment_key: "global",
    segment_type: "global",
    avg_score: 3.1,
    std_score: 0.8,
    favorability_pct: 60,
    response_count: 30,
    respondent_count: 30,
  });

  // 11. Create business_indicators
  await adminClient.from("business_indicators").insert({
    campaign_id: campaignAId,
    indicator_name: "Rotación",
    indicator_value: 12.5,
    indicator_unit: "%",
    indicator_type: "turnover_rate",
  });

  await adminClient.from("business_indicators").insert({
    campaign_id: campaignBId,
    indicator_name: "Rotación",
    indicator_value: 8.0,
    indicator_unit: "%",
    indicator_type: "turnover_rate",
  });

  // 12. Create additional users for extended tests
  // User A2 — second org_admin in Org A
  const { data: uA2, error: errA2 } = await adminClient.auth.admin.createUser({
    email: USER_A2_EMAIL,
    password: USER_A2_PASSWORD,
    email_confirm: true,
  });
  if (errA2) throw new Error(`Failed to create user A2: ${errA2.message}`);
  userA2Id = uA2.user.id;
  await adminClient
    .from("profiles")
    .update({ organization_id: orgAId, role: "org_admin" })
    .eq("id", userA2Id);

  // User A3 — member role in Org A (least privilege)
  const { data: uA3, error: errA3 } = await adminClient.auth.admin.createUser({
    email: USER_A3_EMAIL,
    password: USER_A3_PASSWORD,
    email_confirm: true,
  });
  if (errA3) throw new Error(`Failed to create user A3: ${errA3.message}`);
  userA3Id = uA3.user.id;
  await adminClient
    .from("profiles")
    .update({ organization_id: orgAId, role: "member" })
    .eq("id", userA3Id);

  // Orphan user — authenticated but no org assigned (null organization_id)
  const { data: uOrphan, error: errOrphan } = await adminClient.auth.admin.createUser({
    email: USER_ORPHAN_EMAIL,
    password: USER_ORPHAN_PASSWORD,
    email_confirm: true,
  });
  if (errOrphan) throw new Error(`Failed to create orphan user: ${errOrphan.message}`);
  userOrphanId = uOrphan.user.id;
  // Deliberately do NOT assign org — profile has organization_id = null

  // 13. Scale data: 12 departments × 8 respondents = 96 for Org A campaign
  scaleRespondentIds = [];
  scaleParticipantIds = [];
  for (const dept of SCALE_DEPARTMENTS) {
    for (let i = 0; i < 8; i++) {
      const { data: resp } = await adminClient
        .from("respondents")
        .insert({
          campaign_id: campaignAId,
          token: crypto.randomUUID(),
          department: dept,
          status: "completed",
        })
        .select("id")
        .single();
      if (resp) {
        scaleRespondentIds.push(resp.id);
        const { data: part } = await adminClient
          .from("participants")
          .insert({
            campaign_id: campaignAId,
            respondent_id: resp.id,
            name: `${dept} P${i + 1}`,
            email: `${dept.toLowerCase().replace(/\s/g, "")}-${i + 1}@test.internal`,
            department: dept,
          })
          .select("id")
          .single();
        if (part) scaleParticipantIds.push(part.id);
      }
    }
  }

  // 14. Create authenticated clients for all users
  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInErrA } = await clientA.auth.signInWithPassword({
    email: USER_A_EMAIL,
    password: USER_A_PASSWORD,
  });
  if (signInErrA) throw new Error(`Failed to sign in user A: ${signInErrA.message}`);
  clientOrgA = clientA;

  const clientB = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInErrB } = await clientB.auth.signInWithPassword({
    email: USER_B_EMAIL,
    password: USER_B_PASSWORD,
  });
  if (signInErrB) throw new Error(`Failed to sign in user B: ${signInErrB.message}`);
  clientOrgB = clientB;

  const cA2 = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInA2 } = await cA2.auth.signInWithPassword({
    email: USER_A2_EMAIL,
    password: USER_A2_PASSWORD,
  });
  if (signInA2) throw new Error(`Failed to sign in user A2: ${signInA2.message}`);
  clientA2 = cA2;

  const cA3 = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInA3 } = await cA3.auth.signInWithPassword({
    email: USER_A3_EMAIL,
    password: USER_A3_PASSWORD,
  });
  if (signInA3) throw new Error(`Failed to sign in user A3: ${signInA3.message}`);
  clientA3 = cA3;

  const cOrphan = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInOrphan } = await cOrphan.auth.signInWithPassword({
    email: USER_ORPHAN_EMAIL,
    password: USER_ORPHAN_PASSWORD,
  });
  if (signInOrphan) throw new Error(`Failed to sign in orphan: ${signInOrphan.message}`);
  clientOrphan = cOrphan;
}

async function teardownTestData() {
  const allCampaignIds = [campaignAId, campaignBId].filter(Boolean);
  const allRespondentIds = [respondentAId, respondentBId, ...scaleRespondentIds].filter(Boolean);
  const allUserIds = [userAId, userBId, userA2Id, userA3Id, userOrphanId].filter(Boolean);
  const allOrgIds = [orgAId, orgBId].filter(Boolean);

  // Delete in reverse dependency order using admin (service_role)
  if (allCampaignIds.length > 0) {
    await adminClient.from("business_indicators").delete().in("campaign_id", allCampaignIds);
    await adminClient.from("campaign_analytics").delete().in("campaign_id", allCampaignIds);
    await adminClient.from("campaign_results").delete().in("campaign_id", allCampaignIds);
  }
  if (openResponseAId || openResponseBId) {
    await adminClient
      .from("open_responses")
      .delete()
      .in("id", [openResponseAId, openResponseBId].filter(Boolean));
  }
  if (allCampaignIds.length > 0) {
    await adminClient.from("participants").delete().in("campaign_id", allCampaignIds);
  }
  if (allRespondentIds.length > 0) {
    await adminClient.from("responses").delete().in("respondent_id", allRespondentIds);
    await adminClient.from("respondents").delete().in("id", allRespondentIds);
  }
  if (allCampaignIds.length > 0) {
    await adminClient.from("campaigns").delete().in("id", allCampaignIds);
  }
  if (allUserIds.length > 0) {
    await adminClient.from("profiles").delete().in("id", allUserIds);
  }
  if (allOrgIds.length > 0) {
    await adminClient.from("organizations").delete().in("id", allOrgIds);
  }

  // Delete auth users
  for (const uid of allUserIds) {
    try {
      await adminClient.auth.admin.deleteUser(uid);
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// Test Suites
// ============================================================

describe("RLS Multi-Tenant Isolation", () => {
  beforeAll(setupTestData, 30_000); // 30s timeout for setup
  afterAll(teardownTestData, 15_000);

  // --------------------------------------------------------
  // Block A: Legitimate access — Org A reads own data
  // --------------------------------------------------------
  describe("Acceso legítimo — Org A lee sus propios datos", () => {
    it("puede leer su propia organización", async () => {
      const { data, error } = await clientOrgA.from("organizations").select("*").eq("id", orgAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(orgAId);
    });

    it("puede leer sus propias campañas", async () => {
      const { data, error } = await clientOrgA.from("campaigns").select("*").eq("id", campaignAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].organization_id).toBe(orgAId);
    });

    it("puede leer sus propios respondentes", async () => {
      const { data, error } = await clientOrgA
        .from("respondents")
        .select("*")
        .eq("campaign_id", campaignAId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it("puede leer sus propios participantes (PII)", async () => {
      const { data, error } = await clientOrgA
        .from("participants")
        .select("*")
        .eq("campaign_id", campaignAId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it("puede leer sus propias open_responses", async () => {
      const { data, error } = await clientOrgA
        .from("open_responses")
        .select("*")
        .eq("id", openResponseAId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it("puede leer sus propios resultados", async () => {
      const { data, error } = await clientOrgA
        .from("campaign_results")
        .select("*")
        .eq("campaign_id", campaignAId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it("puede leer sus propios analytics", async () => {
      const { data, error } = await clientOrgA
        .from("campaign_analytics")
        .select("*")
        .eq("campaign_id", campaignAId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it("puede leer sus propios business indicators", async () => {
      const { data, error } = await clientOrgA
        .from("business_indicators")
        .select("*")
        .eq("campaign_id", campaignAId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------
  // Block B: Cross-tenant reads — Org A CANNOT read Org B
  // --------------------------------------------------------
  describe("Aislamiento — Org A NO puede leer datos de Org B", () => {
    it("no puede leer la organización de Org B", async () => {
      const { data } = await clientOrgA.from("organizations").select("*").eq("id", orgBId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer campañas de Org B", async () => {
      const { data } = await clientOrgA.from("campaigns").select("*").eq("id", campaignBId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer respondentes de Org B", async () => {
      const { data } = await clientOrgA
        .from("respondents")
        .select("*")
        .eq("campaign_id", campaignBId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer participantes (PII) de Org B", async () => {
      const { data } = await clientOrgA
        .from("participants")
        .select("*")
        .eq("campaign_id", campaignBId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer open_responses de Org B", async () => {
      const { data } = await clientOrgA
        .from("open_responses")
        .select("*")
        .eq("id", openResponseBId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer resultados de Org B", async () => {
      const { data } = await clientOrgA
        .from("campaign_results")
        .select("*")
        .eq("campaign_id", campaignBId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer analytics de Org B", async () => {
      const { data } = await clientOrgA
        .from("campaign_analytics")
        .select("*")
        .eq("campaign_id", campaignBId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer business indicators de Org B", async () => {
      const { data } = await clientOrgA
        .from("business_indicators")
        .select("*")
        .eq("campaign_id", campaignBId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer participantes de Org B aunque conozca el campaign_id", async () => {
      const { data } = await clientOrgA
        .from("participants")
        .select("id, name, email")
        .eq("campaign_id", campaignBId);
      expect(data).toHaveLength(0);
    });
  });

  // --------------------------------------------------------
  // Block B (reverse): Org B CANNOT read Org A
  // --------------------------------------------------------
  describe("Aislamiento inverso — Org B NO puede leer datos de Org A", () => {
    it("no puede leer la organización de Org A", async () => {
      const { data } = await clientOrgB.from("organizations").select("*").eq("id", orgAId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer campañas de Org A", async () => {
      const { data } = await clientOrgB.from("campaigns").select("*").eq("id", campaignAId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer analytics de Org A", async () => {
      const { data } = await clientOrgB
        .from("campaign_analytics")
        .select("*")
        .eq("campaign_id", campaignAId);
      expect(data).toHaveLength(0);
    });

    it("no puede leer open_responses de Org A", async () => {
      const { data } = await clientOrgB
        .from("open_responses")
        .select("*")
        .eq("id", openResponseAId);
      expect(data).toHaveLength(0);
    });
  });

  // --------------------------------------------------------
  // Block C: Anonymous access
  // --------------------------------------------------------
  describe("Acceso anónimo — sin autenticación", () => {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);

    it("no puede leer organizaciones directamente", async () => {
      const { data } = await anonClient.from("organizations").select("id");
      expect(data).toHaveLength(0);
    });

    it("no puede leer campañas activas directamente", async () => {
      const { data } = await anonClient
        .from("campaigns")
        .select("id, status")
        .eq("status", "active");
      expect(data).toHaveLength(0);
    });

    it("no puede leer campañas con status draft", async () => {
      // Create a draft campaign to test
      const { data: draftCamp } = await adminClient
        .from("campaigns")
        .insert({
          organization_id: orgAId,
          instrument_id: instrumentId,
          name: "RLS Test Draft",
          status: "draft",
        })
        .select("id")
        .single();

      const { data } = await anonClient.from("campaigns").select("id").eq("id", draftCamp!.id);
      expect(data).toHaveLength(0);

      // Cleanup
      await adminClient.from("campaigns").delete().eq("id", draftCamp!.id);
    });

    it("no puede leer participantes (PII)", async () => {
      const { data } = await anonClient.from("participants").select("*");
      expect(data).toHaveLength(0);
    });

    it("no puede leer campaign_results", async () => {
      const { data } = await anonClient.from("campaign_results").select("*");
      expect(data).toHaveLength(0);
    });

    it("no puede leer campaign_analytics", async () => {
      const { data } = await anonClient.from("campaign_analytics").select("*");
      expect(data).toHaveLength(0);
    });

    it("no puede leer business_indicators", async () => {
      const { data } = await anonClient.from("business_indicators").select("*");
      expect(data).toHaveLength(0);
    });

    it("no puede leer open_responses", async () => {
      const { data } = await anonClient.from("open_responses").select("*");
      expect(data).toHaveLength(0);
    });
  });

  // --------------------------------------------------------
  // Block D: Cross-tenant mutations
  // --------------------------------------------------------
  describe("Mutaciones cross-tenant — Org A NO puede modificar datos de Org B", () => {
    it("no puede actualizar la organización de Org B", async () => {
      await clientOrgA.from("organizations").update({ name: "Hacked by A" }).eq("id", orgBId);

      // Verify name unchanged via admin
      const { data } = await adminClient
        .from("organizations")
        .select("name")
        .eq("id", orgBId)
        .single();
      expect(data!.name).toBe("RLS Test Org Beta");
    });

    it("no puede insertar una campaña en Org B", async () => {
      const { error } = await clientOrgA.from("campaigns").insert({
        organization_id: orgBId,
        instrument_id: instrumentId,
        name: "Injected by A",
        status: "draft",
      });
      // Should fail — either policy violation or 0 rows
      expect(error).not.toBeNull();
    });

    it("no puede eliminar campañas de Org B", async () => {
      await clientOrgA.from("campaigns").delete().eq("id", campaignBId);

      // Verify campaign still exists via admin
      const { data } = await adminClient
        .from("campaigns")
        .select("id")
        .eq("id", campaignBId)
        .single();
      expect(data).not.toBeNull();
    });

    it("no puede actualizar respondentes de Org B", async () => {
      await clientOrgA.from("respondents").update({ department: "Hacked" }).eq("id", respondentBId);

      // Verify unchanged
      const { data } = await adminClient
        .from("respondents")
        .select("department")
        .eq("id", respondentBId)
        .single();
      expect(data!.department).toBe("Operations");
    });

    it("no puede eliminar participantes de Org B", async () => {
      await clientOrgA.from("participants").delete().eq("campaign_id", campaignBId);

      // Verify still exists
      const { data } = await adminClient
        .from("participants")
        .select("id")
        .eq("campaign_id", campaignBId);
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it("no puede eliminar business indicators de Org B", async () => {
      await clientOrgA.from("business_indicators").delete().eq("campaign_id", campaignBId);

      // Verify still exists
      const { data } = await adminClient
        .from("business_indicators")
        .select("id")
        .eq("campaign_id", campaignBId);
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------
  // Block E: Profile isolation
  // --------------------------------------------------------
  describe("Aislamiento de perfiles", () => {
    it("Org A no puede ver el perfil de Org B", async () => {
      const { data } = await clientOrgA.from("profiles").select("*").eq("id", userBId);
      expect(data).toHaveLength(0);
    });

    it("Org B no puede ver el perfil de Org A", async () => {
      const { data } = await clientOrgB.from("profiles").select("*").eq("id", userAId);
      expect(data).toHaveLength(0);
    });

    it("cada usuario puede ver su propio perfil", async () => {
      const { data } = await clientOrgA.from("profiles").select("*").eq("id", userAId);
      expect(data).toHaveLength(1);
      expect(data![0].organization_id).toBe(orgAId);
    });
  });

  // --------------------------------------------------------
  // Block F: Multiple users — same organization
  // --------------------------------------------------------
  describe("Múltiples usuarios — misma organización", () => {
    it("dos org_admin de Org A ven las mismas campañas", async () => {
      const { data: dataA1 } = await clientOrgA.from("campaigns").select("id").order("id");
      const { data: dataA2 } = await clientA2.from("campaigns").select("id").order("id");
      expect(dataA1).toEqual(dataA2);
    });

    it("usuario A2 no puede ver datos de Org B", async () => {
      const { data } = await clientA2.from("organizations").select("*").eq("id", orgBId);
      expect(data).toHaveLength(0);
    });

    it("usuario A2 no puede modificar datos de Org B", async () => {
      await clientA2.from("campaigns").update({ name: "Injected by A2" }).eq("id", campaignBId);

      const { data: verify } = await adminClient
        .from("campaigns")
        .select("name")
        .eq("id", campaignBId)
        .single();
      expect(verify!.name).toBe("RLS Test Campaign Beta");
    });

    it("tres usuarios concurrentes de Org A ven datos consistentes", async () => {
      const [r1, r2, r3] = await Promise.all([
        clientOrgA.from("campaigns").select("id").order("id"),
        clientA2.from("campaigns").select("id").order("id"),
        clientA3.from("campaigns").select("id").order("id"),
      ]);
      // org_admin users should see the same data
      expect(r1.data).toEqual(r2.data);
      // member (A3) may see less or equal depending on policies
      // At minimum, they should not see more than org_admin
      expect(r3.data!.length).toBeLessThanOrEqual(r1.data!.length);
    });

    it("usuario A2 puede ver participantes de Org A", async () => {
      const { data } = await clientA2
        .from("participants")
        .select("id")
        .eq("campaign_id", campaignAId);
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it("usuario A2 no puede ver participantes de Org B", async () => {
      const { data } = await clientA2
        .from("participants")
        .select("id")
        .eq("campaign_id", campaignBId);
      expect(data).toHaveLength(0);
    });
  });

  // --------------------------------------------------------
  // Block G: Orphan user — no organization assigned
  // --------------------------------------------------------
  describe("Usuario sin organización — edge case post-registro", () => {
    it("no puede leer ninguna organización (excepto via anon policy)", async () => {
      // org_admin policy checks id = get_user_org_id(), which is null
      // The only orgs visible would be via anon SELECT true policy
      // But authenticated users use authenticated policies, not anon
      const { data } = await clientOrphan.from("organizations").select("*");
      // Should see 0 since get_user_org_id() returns null and role is not super_admin
      expect(data).toHaveLength(0);
    });

    it("no puede leer ninguna campaña", async () => {
      const { data } = await clientOrphan.from("campaigns").select("*");
      expect(data).toHaveLength(0);
    });

    it("no puede leer ningún participante", async () => {
      const { data } = await clientOrphan.from("participants").select("*");
      expect(data).toHaveLength(0);
    });

    it("no puede leer resultados de ninguna campaña", async () => {
      const { data } = await clientOrphan.from("campaign_results").select("*");
      expect(data).toHaveLength(0);
    });

    it("no puede leer analytics de ninguna campaña", async () => {
      const { data } = await clientOrphan.from("campaign_analytics").select("*");
      expect(data).toHaveLength(0);
    });

    it("no puede insertar una organización (requiere super_admin)", async () => {
      const { error } = await clientOrphan.from("organizations").insert({
        name: "Org Injected by Orphan",
        slug: "orphan-inject",
        employee_count: 10,
        country: "PA",
        industry: "Test",
      });
      expect(error).not.toBeNull();
    });

    it("no puede leer perfiles de otros usuarios", async () => {
      const { data } = await clientOrphan.from("profiles").select("*").eq("id", userAId);
      expect(data).toHaveLength(0);
    });

    it("puede ver su propio perfil", async () => {
      const { data } = await clientOrphan.from("profiles").select("*").eq("id", userOrphanId);
      expect(data).toHaveLength(1);
      expect(data![0].organization_id).toBeNull();
    });
  });

  // --------------------------------------------------------
  // Block H: Cross-table joins — RLS propagation
  // --------------------------------------------------------
  describe("Joins cross-tabla — RLS se propaga correctamente", () => {
    it("join campaigns + organizations solo retorna datos de Org A", async () => {
      const { data } = await clientOrgA.from("campaigns").select("*, organizations(name)");
      expect(data!.length).toBeGreaterThanOrEqual(1);
      expect(data!.every((c) => c.organization_id === orgAId)).toBe(true);
    });

    it("join participants + campaigns no filtra datos de Org B", async () => {
      const { data } = await clientOrgA.from("participants").select("id, campaign_id");
      // All participants should belong to Org A campaigns
      expect(data!.every((p) => p.campaign_id === campaignAId)).toBe(true);
    });

    it("join campaign_results + campaigns solo retorna resultados de Org A", async () => {
      const { data } = await clientOrgA
        .from("campaign_results")
        .select("*, campaigns(organization_id)");
      expect(data!.length).toBeGreaterThanOrEqual(1);
      expect(
        data!.every((r) => (r.campaigns as Record<string, string>)?.organization_id === orgAId)
      ).toBe(true);
    });

    it("join campaign_analytics + campaigns solo retorna analytics de Org A", async () => {
      const { data } = await clientOrgA
        .from("campaign_analytics")
        .select("*, campaigns(organization_id)");
      expect(data!.length).toBeGreaterThanOrEqual(1);
      expect(
        data!.every((a) => (a.campaigns as Record<string, string>)?.organization_id === orgAId)
      ).toBe(true);
    });

    it("join business_indicators + campaigns solo retorna indicadores de Org A", async () => {
      const { data } = await clientOrgA
        .from("business_indicators")
        .select("*, campaigns(organization_id)");
      expect(data!.length).toBeGreaterThanOrEqual(1);
      expect(
        data!.every((b) => (b.campaigns as Record<string, string>)?.organization_id === orgAId)
      ).toBe(true);
    });

    // No public views in the schema — verified via migration audit
    it.skip("vistas del schema respetan RLS (no hay vistas públicas)", () => {});
  });

  // --------------------------------------------------------
  // Block I: Scale — 12 departments, ~96 respondents
  // --------------------------------------------------------
  describe("Escala — organización con 12 departamentos", () => {
    it("usuario de Org A puede leer todos sus participantes sin timeout", async () => {
      const start = Date.now();
      const { data, error } = await clientOrgA
        .from("participants")
        .select("*")
        .eq("campaign_id", campaignAId);
      const elapsed = Date.now() - start;

      expect(error).toBeNull();
      // 96 scale + 1 original = 97 expected
      expect(data!.length).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(5000); // 5s max for local
    });

    it("filtro por departamento funciona correctamente con RLS activo", async () => {
      const { data } = await clientOrgA
        .from("participants")
        .select("*")
        .eq("campaign_id", campaignAId)
        .eq("department", "Tecnología");

      expect(data!.length).toBe(8);
      expect(data!.every((p) => p.department === "Tecnología")).toBe(true);
    });

    it("usuario de Org B no puede ver participantes de escala de Org A", async () => {
      const { data } = await clientOrgB
        .from("participants")
        .select("*")
        .eq("campaign_id", campaignAId);
      expect(data).toHaveLength(0);
    });

    it("acceso concurrente de 3 usuarios a datos de Org A no degrada", async () => {
      const start = Date.now();

      const [r1, r2] = await Promise.all([
        clientOrgA.from("participants").select("id").eq("campaign_id", campaignAId),
        clientA2.from("participants").select("id").eq("campaign_id", campaignAId),
        clientA3.from("participants").select("id").eq("campaign_id", campaignAId),
      ]);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10000); // 10s for 3 concurrent queries on local
      // org_admin users should get the same count
      expect(r1.data!.length).toBe(r2.data!.length);
    });

    it("12 departamentos distintos están representados", async () => {
      const { data } = await clientOrgA
        .from("participants")
        .select("department")
        .eq("campaign_id", campaignAId);

      const departments = new Set(data!.map((p) => p.department).filter(Boolean));
      expect(departments.size).toBeGreaterThanOrEqual(12);
    });
  });

  // --------------------------------------------------------
  // Block J: SECURITY DEFINER functions — cross-org access
  // --------------------------------------------------------
  describe("Funciones SECURITY DEFINER — acceso cross-org", () => {
    it("get_org_department_counts rechaza consulta de org ajena", async () => {
      const { data, error } = await clientOrgA.rpc("get_org_department_counts", { org_id: orgBId });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("access_denied");
      expect(data).toBeNull();
    });

    it("get_org_department_counts funciona para org propia", async () => {
      const { data, error } = await clientOrgA.rpc("get_org_department_counts", { org_id: orgAId });

      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it("usuario sin org no puede llamar get_org_department_counts", async () => {
      const { data, error } = await clientOrphan.rpc("get_org_department_counts", {
        org_id: orgAId,
      });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });
});

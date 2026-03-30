# Statistical API Production Readiness Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CFA, HLM, invariance, and ONA work in production by replacing `execFile("python3")` with an HTTP API, fix wave comparison bugs, add seed enrichment, and add execution buttons.

**Architecture:** A FastAPI service (`services/statistical-api/`) combines ONA and statistical engine into HTTP endpoints. Next.js calls it via `fetch(STATISTICAL_ENGINE_URL)` instead of `execFile`. The API connects to Supabase directly and saves results to `campaign_analytics`. Wave comparison and seed script bugs are independent TypeScript fixes.

**Tech Stack:** Python 3.11+ (FastAPI, uvicorn, igraph, semopy, statsmodels, pandas, numpy, scipy, matplotlib), Next.js 16 (server actions, shadcn/ui), Supabase.

---

## File Map

### New Files

| File                                                                            | Responsibility                                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `services/statistical-api/main.py`                                              | FastAPI app: 5 endpoints (`/health`, `/ona`, `/cfa`, `/invariance`, `/hlm`) |
| `services/statistical-api/engine/ona.py`                                        | ONA analysis logic (extracted from `scripts/ona-analysis.py`)               |
| `services/statistical-api/engine/cfa.py`                                        | CFA logic (extracted from `scripts/statistical-engine.py`)                  |
| `services/statistical-api/engine/invariance.py`                                 | Invariance logic                                                            |
| `services/statistical-api/engine/hlm.py`                                        | HLM logic                                                                   |
| `services/statistical-api/engine/data.py`                                       | Shared data loading (Supabase queries, matrix building)                     |
| `services/statistical-api/requirements.txt`                                     | Python dependencies                                                         |
| `services/statistical-api/Dockerfile`                                           | Container for deployment                                                    |
| `src/app/(dashboard)/campaigns/[id]/results/technical/run-analysis-buttons.tsx` | Client component with CFA/HLM/invariance buttons                            |

### Modified Files

| File                                                            | Change                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/actions/statistical-validation.ts`                         | Replace `execFile` with `fetch(STATISTICAL_ENGINE_URL)`                 |
| `src/actions/campaigns.ts`                                      | Replace ONA `execFile` with `fetch`, auto-trigger CFA/HLM after scoring |
| `src/app/(dashboard)/campaigns/[id]/results/trends/page.tsx`    | Fix wave_comparison metadata field mapping                              |
| `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx` | Add run buttons component                                               |
| `scripts/seed-results.ts`                                       | Add wave comparison enrichment                                          |
| `src/lib/env.ts`                                                | Add `STATISTICAL_ENGINE_URL`                                            |

---

## Chunk 1: FastAPI Service

### Task 1: Shared data loading module

**Files:**

- Create: `services/statistical-api/engine/__init__.py`
- Create: `services/statistical-api/engine/data.py`

- [ ] **Step 1: Create package init**

```python
# services/statistical-api/engine/__init__.py
```

Empty file to make `engine` a package.

- [ ] **Step 2: Create shared data loader**

Extract the common data loading logic used by both ONA and statistical-engine into a shared module. This is the same pattern both scripts use: load respondents → load dimensions/items → load responses → build matrix.

```python
# services/statistical-api/engine/data.py
"""Shared Supabase data loading for all analysis engines."""

import os
import numpy as np
import pandas as pd
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

ENG_CODE = "ENG"


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def load_campaign_response_matrix(
    sb: Client, campaign_id: str, *, exclude_eng: bool = False
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load respondents, items, and build respondent × item score matrix.

    Args:
        sb: Supabase client
        campaign_id: Campaign UUID
        exclude_eng: If True, exclude ENG dimension items (used by ONA)

    Returns:
        (respondent_df, item_df, matrix) where matrix has respondent_id as index
        and item_id as columns with adjusted scores (reverse items inverted).
    """
    resp = (
        sb.table("respondents")
        .select("id, department, tenure, gender")
        .eq("campaign_id", campaign_id)
        .eq("status", "completed")
        .execute()
    )
    respondent_df = pd.DataFrame(resp.data)
    if respondent_df.empty:
        return respondent_df, pd.DataFrame(), pd.DataFrame()

    # Get campaign instruments
    camp = (
        sb.table("campaigns")
        .select("instrument_id, module_instrument_ids")
        .eq("id", campaign_id)
        .single()
        .execute()
    )
    instrument_ids = [camp.data["instrument_id"]]
    if camp.data.get("module_instrument_ids"):
        instrument_ids.extend(camp.data["module_instrument_ids"])

    # Load dimensions for all instruments
    all_dims = []
    for iid in instrument_ids:
        dims = (
            sb.table("dimensions")
            .select("id, code, category")
            .eq("instrument_id", iid)
            .execute()
        )
        all_dims.extend(dims.data)
    dim_df = pd.DataFrame(all_dims)

    if exclude_eng:
        dim_df = dim_df[dim_df["code"] != ENG_CODE]

    if dim_df.empty:
        return respondent_df, pd.DataFrame(), pd.DataFrame()

    # Load items
    items_resp = (
        sb.table("items")
        .select("id, dimension_id, is_reverse, is_attention_check")
        .in_("dimension_id", dim_df["id"].tolist())
        .eq("is_attention_check", False)
        .execute()
    )
    item_df = pd.DataFrame(items_resp.data)
    item_df = item_df.merge(
        dim_df[["id", "code"]], left_on="dimension_id", right_on="id", suffixes=("", "_dim")
    )

    # Load responses in batches
    rids = respondent_df["id"].tolist()
    all_responses = []
    batch_size = 500
    for i in range(0, len(rids), batch_size):
        batch = rids[i : i + batch_size]
        r = (
            sb.table("responses")
            .select("respondent_id, item_id, score")
            .in_("respondent_id", batch)
            .execute()
        )
        all_responses.extend(r.data)

    response_df = pd.DataFrame(all_responses)
    if response_df.empty:
        return respondent_df, item_df, pd.DataFrame()

    # Merge item info and adjust reverse items
    response_df = response_df.merge(
        item_df[["id", "is_reverse", "code"]],
        left_on="item_id",
        right_on="id",
        suffixes=("", "_item"),
    )
    response_df["adjusted_score"] = response_df.apply(
        lambda row: 6 - row["score"] if row["is_reverse"] else row["score"], axis=1
    )

    # Pivot to matrix
    matrix = response_df.pivot_table(
        index="respondent_id", columns="item_id", values="adjusted_score", aggfunc="first"
    )

    return respondent_df, item_df, matrix


def save_results(sb: Client, campaign_id: str | None, analysis_type: str, data: dict):
    """Save analysis results to campaign_analytics, replacing previous results."""
    import json

    row = {
        "analysis_type": analysis_type,
        "data": json.loads(json.dumps(data, default=str)),
    }
    if campaign_id:
        row["campaign_id"] = campaign_id
        sb.table("campaign_analytics").delete().eq(
            "campaign_id", campaign_id
        ).eq("analysis_type", analysis_type).execute()
    sb.table("campaign_analytics").insert(row).execute()
```

- [ ] **Step 3: Commit**

```bash
git add services/statistical-api/engine/
git commit -m "feat: create shared data loading module for statistical API"
```

---

### Task 2: Extract ONA into module

**Files:**

- Create: `services/statistical-api/engine/ona.py`

- [ ] **Step 1: Extract ONA logic from `scripts/ona-analysis.py`**

Move the core analysis functions (`analyze_campaign`, similarity graph building, Leiden community detection, centrality metrics, graph visualization) into `engine/ona.py`. The function should accept a campaign_id and return the result dict (same structure currently saved to `campaign_analytics`).

```python
# services/statistical-api/engine/ona.py
"""ONA — Perceptual Network Analysis."""

import base64
import io
from collections import defaultdict
from datetime import datetime, timezone

import igraph as ig
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.spatial.distance import pdist, squareform

from .data import get_supabase, load_campaign_response_matrix, save_results

MIN_RESPONDENTS = 10
STABILITY_ITERATIONS = 50


def run_ona(campaign_id: str) -> dict:
    """Run full ONA analysis for a campaign. Returns result dict."""
    sb = get_supabase()
    respondent_df, item_df, matrix = load_campaign_response_matrix(
        sb, campaign_id, exclude_eng=True
    )

    if matrix.empty or len(matrix) < MIN_RESPONDENTS:
        return {"error": f"Insufficient respondents ({len(matrix)} < {MIN_RESPONDENTS})"}

    # Build dimension-level vectors per respondent
    dim_codes = sorted(item_df["code"].unique())
    vectors = pd.DataFrame(index=matrix.index)
    col_map = {col: f"x_{col[:8]}" for col in matrix.columns}
    matrix_r = matrix.rename(columns=col_map)

    for code in dim_codes:
        dim_items = item_df[item_df["code"] == code]["id"].tolist()
        cols = [f"x_{iid[:8]}" for iid in dim_items]
        valid = [c for c in cols if c in matrix_r.columns]
        if valid:
            vectors[code] = matrix_r[valid].mean(axis=1)

    vectors = vectors.dropna()
    if len(vectors) < MIN_RESPONDENTS:
        return {"error": f"Insufficient complete vectors ({len(vectors)} < {MIN_RESPONDENTS})"}

    # --- Copy core ONA logic from scripts/ona-analysis.py ---
    # (cosine similarity, adaptive threshold, graph construction,
    #  Leiden community detection, stability analysis, centrality,
    #  department density, bridges, graph image generation)
    # This is a direct extraction — all functions from ona-analysis.py
    # are moved here unchanged, just using the shared data loader.

    # For brevity, the full ONA logic (~300 lines) is copied from
    # scripts/ona-analysis.py functions: build_similarity_graph(),
    # detect_communities(), compute_stability(), compute_centrality(),
    # build_department_density(), find_bridges(), generate_graph_image(),
    # build_narrative(), analyze_campaign()

    # The key change: instead of calling save_results at the end,
    # return the result dict so the API endpoint can save it.

    result = _analyze_campaign(vectors, respondent_df, dim_codes)
    save_results(sb, campaign_id, "ona_network", result)
    return result


# _analyze_campaign and helper functions extracted from ona-analysis.py
# (exact copy of the analysis logic, ~300 lines)
```

The actual implementation copies all analysis functions from `scripts/ona-analysis.py` (lines 60-450) into this file. The only change is:

- Data loading uses `engine/data.py` instead of inline code
- Results are returned AND saved (not just saved)

- [ ] **Step 2: Commit**

```bash
git add services/statistical-api/engine/ona.py
git commit -m "feat: extract ONA analysis into API module"
```

---

### Task 3: Extract CFA, invariance, HLM into modules

**Files:**

- Create: `services/statistical-api/engine/cfa.py`
- Create: `services/statistical-api/engine/invariance.py`
- Create: `services/statistical-api/engine/hlm.py`

- [ ] **Step 1: Extract CFA from statistical-engine.py**

Move `cmd_cfa`, `build_cfa_model_spec`, `classify_fit` into `engine/cfa.py`. Change function signature to accept campaign_id and return result dict.

```python
# services/statistical-api/engine/cfa.py
"""CFA — Confirmatory Factor Analysis."""
from .data import get_supabase, load_campaign_response_matrix, save_results
# ... extract cmd_cfa logic, expose as run_cfa(campaign_id) -> dict
```

- [ ] **Step 2: Extract invariance**

```python
# services/statistical-api/engine/invariance.py
"""Measurement Invariance."""
from .data import get_supabase, load_campaign_response_matrix, save_results
# ... extract cmd_invariance logic, expose as run_invariance(campaign_id, groups) -> dict
```

- [ ] **Step 3: Extract HLM**

```python
# services/statistical-api/engine/hlm.py
"""HLM — Hierarchical Linear Modeling."""
from .data import get_supabase, load_campaign_response_matrix, save_results
# ... extract cmd_hlm logic, expose as run_hlm(campaign_id) -> dict
```

- [ ] **Step 4: Commit**

```bash
git add services/statistical-api/engine/
git commit -m "feat: extract CFA, invariance, HLM into API modules"
```

---

### Task 4: FastAPI app with endpoints

**Files:**

- Create: `services/statistical-api/main.py`
- Create: `services/statistical-api/requirements.txt`
- Create: `services/statistical-api/Dockerfile`

- [ ] **Step 1: Create FastAPI app**

```python
# services/statistical-api/main.py
"""ClimaLab Statistical API — CFA, Invariance, HLM, ONA."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

API_SECRET = os.environ.get("STATISTICAL_API_SECRET", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify Supabase connection
    from engine.data import get_supabase
    try:
        sb = get_supabase()
        sb.table("campaigns").select("id").limit(1).execute()
        print("✓ Supabase connection verified")
    except Exception as e:
        print(f"⚠ Supabase connection failed: {e}")
    yield


app = FastAPI(title="ClimaLab Statistical API", lifespan=lifespan)


def verify_secret(authorization: str = Header(default="")):
    if API_SECRET and authorization != f"Bearer {API_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


class AnalysisRequest(BaseModel):
    campaign_id: str


class InvarianceRequest(BaseModel):
    campaign_id: str
    groups: str = "department,tenure,gender"


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/ona")
def ona_endpoint(req: AnalysisRequest, authorization: str = Header(default="")):
    verify_secret(authorization)
    from engine.ona import run_ona
    result = run_ona(req.campaign_id)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return {"status": "completed", "data": result}


@app.post("/cfa")
def cfa_endpoint(req: AnalysisRequest, authorization: str = Header(default="")):
    verify_secret(authorization)
    from engine.cfa import run_cfa
    result = run_cfa(req.campaign_id)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return {"status": "completed", "data": result}


@app.post("/invariance")
def invariance_endpoint(req: InvarianceRequest, authorization: str = Header(default="")):
    verify_secret(authorization)
    from engine.invariance import run_invariance
    result = run_invariance(req.campaign_id, req.groups)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return {"status": "completed", "data": result}


@app.post("/hlm")
def hlm_endpoint(req: AnalysisRequest, authorization: str = Header(default="")):
    verify_secret(authorization)
    from engine.hlm import run_hlm
    result = run_hlm(req.campaign_id)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return {"status": "completed", "data": result}
```

- [ ] **Step 2: Create requirements.txt**

```
fastapi>=0.115
uvicorn>=0.30
python-igraph>=1.0.0
semopy>=2.3
statsmodels>=0.14
pandas>=2.0
numpy>=1.24
scipy>=1.10
matplotlib>=3.7
supabase>=2.0.0
```

- [ ] **Step 3: Create Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Verify locally**

```bash
cd services/statistical-api
pip install -r requirements.txt
uvicorn main:app --port 8000 &
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"1.0.0"}
```

- [ ] **Step 5: Commit**

```bash
git add services/statistical-api/
git commit -m "feat: create FastAPI statistical service with ONA, CFA, invariance, HLM"
```

---

## Chunk 2: Replace execFile with fetch in Next.js

### Task 5: Add STATISTICAL_ENGINE_URL to env

**Files:**

- Modify: `src/lib/env.ts`

- [ ] **Step 1: Add env var**

Add to the `envSchema` in `src/lib/env.ts`:

```typescript
STATISTICAL_ENGINE_URL: z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional()
),
STATISTICAL_API_SECRET: optionalString,
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/env.ts
git commit -m "feat: add STATISTICAL_ENGINE_URL and STATISTICAL_API_SECRET env vars"
```

---

### Task 6: Replace statistical-validation.ts to use fetch

**Files:**

- Modify: `src/actions/statistical-validation.ts`

- [ ] **Step 1: Rewrite runStatisticalEngine to use HTTP**

Replace the entire `runStatisticalEngine` function and remove `execFile`/`child_process` imports:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { ActionResult } from "@/types";

async function callStatisticalApi(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ActionResult<string>> {
  if (!env.STATISTICAL_ENGINE_URL) {
    return { success: false, error: "Motor estadístico no configurado (STATISTICAL_ENGINE_URL)" };
  }

  try {
    const response = await fetch(`${env.STATISTICAL_ENGINE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.STATISTICAL_API_SECRET
          ? { Authorization: `Bearer ${env.STATISTICAL_API_SECRET}` }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000), // 5 min timeout
    });

    if (!response.ok) {
      const detail = await response.text();
      return { success: false, error: `Motor estadístico: ${detail}` };
    }

    const data = await response.json();
    return { success: true, data: data.status ?? "completed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error contactando motor estadístico",
    };
  }
}

async function verifyAccess(campaignId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("campaigns").select("id").eq("id", campaignId).maybeSingle();
  return !!data;
}

export async function runCampaignCFA(campaignId: string): Promise<ActionResult<string>> {
  if (!(await verifyAccess(campaignId))) return { success: false, error: "Campaña no encontrada" };
  return callStatisticalApi("/cfa", { campaign_id: campaignId });
}

export async function runCampaignInvariance(campaignId: string): Promise<ActionResult<string>> {
  if (!(await verifyAccess(campaignId))) return { success: false, error: "Campaña no encontrada" };
  return callStatisticalApi("/invariance", { campaign_id: campaignId });
}

export async function runCampaignHLM(campaignId: string): Promise<ActionResult<string>> {
  if (!(await verifyAccess(campaignId))) return { success: false, error: "Campaña no encontrada" };
  return callStatisticalApi("/hlm", { campaign_id: campaignId });
}

// GET functions remain unchanged — they read from Supabase directly
export async function getCampaignCFA(campaignId: string): Promise<ActionResult<unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "cfa_campaign")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data?.data ?? null };
}

export async function getCampaignInvariance(campaignId: string): Promise<ActionResult<unknown[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "invariance_campaign")
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []).map((row) => row.data) };
}

export async function getCampaignHLM(campaignId: string): Promise<ActionResult<unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "hlm_campaign")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data?.data ?? null };
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/actions/statistical-validation.ts
git commit -m "refactor: replace execFile with fetch for CFA/invariance/HLM"
```

---

### Task 7: Replace ONA execFile in campaigns.ts + auto-trigger CFA/HLM

**Files:**

- Modify: `src/actions/campaigns.ts`

- [ ] **Step 1: Replace ONA invocation with HTTP call**

Replace the entire try/catch block (lines 231-288) that uses `execFile` for ONA:

```typescript
// Replace the execFile ONA block with:
const statisticalUrl = env.STATISTICAL_ENGINE_URL;

if (statisticalUrl) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.STATISTICAL_API_SECRET) {
    headers["Authorization"] = `Bearer ${env.STATISTICAL_API_SECRET}`;
  }
  const body = JSON.stringify({ campaign_id: campaignId });

  // ONA — fire and forget
  const onaRun = await admin
    .from("campaign_ona_runs")
    .insert({
      campaign_id: campaignId,
      analysis_run_id: analysisRunId,
      status: "pending",
      backend: "statistical-api",
      details: { trigger_source: options?.triggerSource ?? (user ? "manual" : "batch") },
    })
    .select("id")
    .single();
  const onaRunId = onaRun.data?.id as string | undefined;

  fetch(`${statisticalUrl}/ona`, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(300_000),
  })
    .then(async (res) => {
      const status = res.ok ? "completed" : "deferred";
      const errorMsg = res.ok ? null : await res.text();
      if (onaRunId) {
        await admin
          .from("campaign_ona_runs")
          .update({ status, error_message: errorMsg, updated_at: new Date().toISOString() })
          .eq("id", onaRunId);
      }
    })
    .catch((err) => {
      if (onaRunId) {
        admin
          .from("campaign_ona_runs")
          .update({
            status: "deferred",
            error_message: err.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", onaRunId)
          .then(({ error }) => {
            if (error) console.error("ONA status update failed:", error.message);
          });
      }
    });

  // Auto-trigger CFA + HLM if thresholds met (fire and forget)
  const respondentCount =
    output.results.find((r) => r.result_type === "dimension" && r.segment_type === "global")
      ?.respondent_count ?? 0;

  if (respondentCount >= 100) {
    fetch(`${statisticalUrl}/cfa`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(300_000),
    }).catch((err) => console.warn("CFA auto-trigger failed:", err.message));
  }
  if (respondentCount >= 50) {
    fetch(`${statisticalUrl}/hlm`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(300_000),
    }).catch((err) => console.warn("HLM auto-trigger failed:", err.message));
  }
} else {
  // No statistical API configured — mark ONA as deferred
  await admin.from("campaign_ona_runs").insert({
    campaign_id: campaignId,
    analysis_run_id: analysisRunId,
    status: "deferred",
    backend: "unavailable",
    error_message: "STATISTICAL_ENGINE_URL not configured",
  });
}
```

Also add import at top of file:

```typescript
import { env } from "@/lib/env";
```

And remove the `child_process` dynamic import since it's no longer needed.

- [ ] **Step 2: Run lint and build**

Run: `npm run lint && npm run build`
Expected: Both pass

- [ ] **Step 3: Commit**

```bash
git add src/actions/campaigns.ts
git commit -m "refactor: replace ONA execFile with HTTP, auto-trigger CFA/HLM after scoring"
```

---

## Chunk 3: Bug Fixes

### Task 8: Fix wave_comparison metadata mismatch in trends page

**Files:**

- Modify: `src/app/(dashboard)/campaigns/[id]/results/trends/page.tsx`

- [ ] **Step 1: Fix metadata field mapping**

The writer (`wave-comparison.ts`) produces:

```typescript
{ delta, welch: { p_value, significant }, effect_size: { label } }
```

But the reader (`trends/page.tsx` line 37-44) expects flat fields `p_value` and `effect_label`. Fix the reader:

```typescript
// Replace lines 32-48 with:
const waveSignificance: Record<string, { p_value: number; delta: number; effect_label: string }> =
  {};
if (resultsResult.success) {
  for (const r of resultsResult.data) {
    if (r.result_type !== "dimension" || r.segment_type !== "global") continue;
    const meta = r.metadata as {
      wave_comparison?: {
        delta: number;
        welch: { p_value: number; significant: boolean } | null;
        effect_size: { d: number; label: string };
      };
    };
    if (meta?.wave_comparison && r.dimension_code) {
      waveSignificance[r.dimension_code] = {
        p_value: meta.wave_comparison.welch?.p_value ?? 1.0,
        delta: meta.wave_comparison.delta,
        effect_label: meta.wave_comparison.effect_size.label,
      };
    }
  }
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/campaigns/\[id\]/results/trends/page.tsx
git commit -m "fix: correct wave_comparison metadata field mapping in trends page"
```

---

### Task 9: Add wave comparison to seed script

**Files:**

- Modify: `scripts/seed-results.ts`

- [ ] **Step 1: Add wave comparison enrichment**

After `scoreCampaignDataset()` and before `materializeAnalysisRun()`, add the same wave comparison logic from `calculateResults()`. Import `buildWaveComparisonFromStats` and query for previous campaign:

```typescript
import { buildWaveComparisonFromStats } from "../src/lib/analysis-engine/wave-comparison";
import type { Json } from "../src/types/database";

// Inside processOneCampaign, after line 43 (const output = scoreCampaignDataset(dataset)):

// Wave comparison enrichment (same logic as calculateResults)
const { data: campaignForOrg } = await supabase
  .from("campaigns")
  .select("organization_id, ends_at")
  .eq("id", campaignId)
  .single();

if (campaignForOrg?.organization_id) {
  const { data: prevCampaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("organization_id", campaignForOrg.organization_id)
    .in("status", ["closed", "archived"])
    .neq("id", campaignId)
    .lt("ends_at", campaignForOrg.ends_at)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevCampaign) {
    const { data: prevResults } = await supabase
      .from("campaign_results")
      .select("dimension_code, avg_score, std_score, respondent_count")
      .eq("campaign_id", prevCampaign.id)
      .eq("result_type", "dimension")
      .eq("segment_type", "global");

    if (prevResults && prevResults.length > 0) {
      const prevByDim = new Map(
        prevResults
          .filter((r) => r.dimension_code != null)
          .map((r) => [r.dimension_code!, r] as const)
      );

      for (const row of output.results) {
        if (
          row.result_type === "dimension" &&
          row.segment_type === "global" &&
          row.dimension_code
        ) {
          const prev = prevByDim.get(row.dimension_code);
          if (prev && prev.avg_score != null && row.avg_score != null) {
            const wc = buildWaveComparisonFromStats({
              currentAvg: row.avg_score,
              currentStd: row.std_score ?? 0.5,
              currentN: row.respondent_count ?? 0,
              previousAvg: Number(prev.avg_score),
              previousStd: Number(prev.std_score) || 0.5,
              previousN: prev.respondent_count ?? 0,
              previousCampaignId: prevCampaign.id,
            });
            if (wc) {
              row.metadata = {
                ...(row.metadata as Record<string, unknown>),
                wave_comparison: wc,
              } as Json;
            }
          }
        }
      }
      console.log(
        `  Wave comparison: enriched with data from campaign ${prevCampaign.id.slice(0, 8)}`
      );
    }
  }
}
```

Note: campaigns are processed in `created_at` order (line 70), so the first campaign will have no previous wave and the second will find the first as its previous wave. The `lt("ends_at", ...)` filter ensures we only compare with campaigns that ended before the current one.

- [ ] **Step 2: Verify seed script**

Run: `supabase db reset && npm run seed:results`
Expected: Second campaign shows "Wave comparison: enriched with data from campaign ..."

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-results.ts
git commit -m "fix: add wave comparison enrichment to seed script"
```

---

### Task 10: Add CFA/HLM/invariance buttons to technical page

**Files:**

- Create: `src/app/(dashboard)/campaigns/[id]/results/technical/run-analysis-buttons.tsx`
- Modify: `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx`

- [ ] **Step 1: Create client component with buttons**

```tsx
// src/app/(dashboard)/campaigns/[id]/results/technical/run-analysis-buttons.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  runCampaignCFA,
  runCampaignInvariance,
  runCampaignHLM,
} from "@/actions/statistical-validation";

type Props = {
  campaignId: string;
  respondentCount: number;
};

const CFA_MIN_N = 100;
const HLM_MIN_N = 50;

export function RunAnalysisButtons({ campaignId, respondentCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<{ success: boolean; error?: string }>) {
    setLoading(label);
    setMessage(null);
    const result = await action();
    setLoading(null);
    if (result.success) {
      setMessage(`${label} completado`);
      router.refresh();
    } else {
      setMessage(`${label}: ${result.error}`);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null || respondentCount < CFA_MIN_N}
        onClick={() => run("CFA", () => runCampaignCFA(campaignId))}
      >
        {loading === "CFA"
          ? "Ejecutando CFA..."
          : `Ejecutar CFA${respondentCount < CFA_MIN_N ? ` (requiere n≥${CFA_MIN_N})` : ""}`}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null || respondentCount < CFA_MIN_N}
        onClick={() => run("Invariancia", () => runCampaignInvariance(campaignId))}
      >
        {loading === "Invariancia"
          ? "Ejecutando..."
          : `Ejecutar Invariancia${respondentCount < CFA_MIN_N ? ` (requiere n≥${CFA_MIN_N})` : ""}`}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null || respondentCount < HLM_MIN_N}
        onClick={() => run("HLM", () => runCampaignHLM(campaignId))}
      >
        {loading === "HLM"
          ? "Ejecutando HLM..."
          : `Ejecutar HLM${respondentCount < HLM_MIN_N ? ` (requiere n≥${HLM_MIN_N})` : ""}`}
      </Button>
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Add buttons to technical page**

In `technical/page.tsx`, find the CFA section (where it says "No ejecutado"). Import the buttons component and render it:

```tsx
import { RunAnalysisButtons } from "./run-analysis-buttons";

// In the JSX, after the CFA/invariance/HLM display sections:
<RunAnalysisButtons campaignId={id} respondentCount={sampleN} />;
```

Where `sampleN` is the valid respondent count already available in the page (extracted from the stats card data).

- [ ] **Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: Both pass

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/campaigns/\[id\]/results/technical/
git commit -m "feat: add CFA/invariance/HLM execution buttons to technical page"
```

---

## Chunk 4: Final Verification

### Task 11: Full verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Verify seed with wave comparison**

Run: `supabase db reset && npm run seed:results`
Expected: Second campaign shows wave comparison enrichment log

- [ ] **Step 5: Verify FastAPI locally**

```bash
cd services/statistical-api
pip install -r requirements.txt
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<dev-key> uvicorn main:app --port 8000 &
curl -X POST http://localhost:8000/health
# Expected: {"status":"ok"}
```

- [ ] **Step 6: Test full flow locally**

Set `STATISTICAL_ENGINE_URL=http://localhost:8000` in `.env.local`, then:

1. Open app at localhost:3000
2. Navigate to a campaign results → Technical
3. Click "Ejecutar CFA" → should complete and show results
4. Click "Ejecutar HLM" → should complete and show ICC values
5. Check Trends page → should show significance badges with real deltas

- [ ] **Step 7: Commit and push**

```bash
git add -A
git commit -m "chore: complete statistical API production readiness"
git push
```

---

## Deployment Notes

### FastAPI Service Deployment Options

The statistical API needs a Python-capable host. Options by complexity:

1. **Railway/Fly.io** — Push `services/statistical-api/` directory, set env vars, deploy. ~$5/mo for idle, scales on demand.
2. **Cloud Run** — Build Docker image, push to GCR, deploy. Pay-per-request, auto-scales to zero.
3. **DGX via Tailscale** — If already accessible, run `uvicorn` as a systemd service. Free, uses existing infra.

### Environment Variables for Production

```bash
# Next.js (Vercel)
STATISTICAL_ENGINE_URL=https://your-statistical-api.railway.app  # or Tailscale URL
STATISTICAL_API_SECRET=<random-32-char-string>

# FastAPI service
SUPABASE_URL=https://fgqufarqxvqytwbuleqp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
STATISTICAL_API_SECRET=<same-random-32-char-string>
```

---

Plan complete and saved to `docs/superpowers/plans/2026-03-30-statistical-api-production.md`. Ready to execute?

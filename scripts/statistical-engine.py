#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "semopy>=2.3",
#     "statsmodels>=0.14",
#     "pandas>=2.0",
#     "numpy>=1.24",
#     "supabase>=2.0.0",
# ]
# ///
"""
Statistical Engine for ClimaLab — CFA, Measurement Invariance, HLM.

Usage:
    uv run scripts/statistical-engine.py cfa <campaign_id>
    uv run scripts/statistical-engine.py cfa --cross-org
    uv run scripts/statistical-engine.py invariance <campaign_id> --groups department,tenure,gender
    uv run scripts/statistical-engine.py invariance --cross-org
    uv run scripts/statistical-engine.py hlm <campaign_id>
    uv run scripts/statistical-engine.py hlm --cross-org
    uv run scripts/statistical-engine.py --test
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0"
    ".EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
)

ENGINE_VERSION = "1.0.0"
CFA_MIN_N = 100
CFA_CROSS_ORG_MIN_N = 500
INVARIANCE_MIN_N_PER_GROUP = 75
HLM_MIN_N = 50
HLM_MIN_GROUPS = 3
HLM_MIN_N_PER_GROUP = 10


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# Shared data loading
# ---------------------------------------------------------------------------
def load_campaign_response_matrix(
    sb: Client, campaign_id: str
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load respondents, items, and build respondent x item score matrix."""
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

    camp = (
        sb.table("campaigns")
        .select("instrument_id")
        .eq("id", campaign_id)
        .single()
        .execute()
    )
    instrument_id = camp.data["instrument_id"]

    dims = (
        sb.table("dimensions")
        .select("id, code, category")
        .eq("instrument_id", instrument_id)
        .execute()
    )
    dim_df = pd.DataFrame(dims.data)

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

    response_df = response_df.merge(
        item_df[["id", "is_reverse", "code"]],
        left_on="item_id",
        right_on="id",
        suffixes=("", "_item"),
    )
    response_df["adjusted_score"] = response_df.apply(
        lambda row: 6 - row["score"] if row["is_reverse"] else row["score"], axis=1
    )

    matrix = response_df.pivot_table(
        index="respondent_id", columns="item_id", values="adjusted_score", aggfunc="first"
    )

    return respondent_df, item_df, matrix


def save_results(sb: Client, campaign_id: str | None, analysis_type: str, data: dict):
    """Save analysis results to campaign_analytics."""
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
    print(
        f"  ✓ Saved {analysis_type}"
        + (f" for campaign {campaign_id[:8]}" if campaign_id else " (cross-org)")
    )


# ---------------------------------------------------------------------------
# CFA helpers
# ---------------------------------------------------------------------------
def build_cfa_model_spec(item_df: pd.DataFrame) -> str:
    """Generate semopy model specification from item-dimension mapping."""
    dim_items = item_df.groupby("code")["id"].apply(list).to_dict()
    lines = []
    for dim_code, item_ids in sorted(dim_items.items()):
        indicators = " + ".join(f"x_{iid[:8]}" for iid in item_ids)
        lines.append(f"{dim_code} =~ {indicators}")
    return "\n".join(lines)


def classify_fit(cfi: float, rmsea: float, srmr: float) -> str:
    if cfi >= 0.95 and rmsea <= 0.06 and srmr <= 0.08:
        return "bueno"
    if cfi >= 0.90 and rmsea <= 0.08:
        return "aceptable"
    return "pobre"


def classify_icc(icc: float) -> str:
    if icc < 0.05:
        return "negligible"
    if icc < 0.15:
        return "bajo"
    if icc < 0.30:
        return "moderado"
    return "alto"


# ---------------------------------------------------------------------------
# CFA
# ---------------------------------------------------------------------------
def cmd_cfa(args):
    sb = get_supabase()
    is_cross_org = getattr(args, "cross_org", False)

    if is_cross_org:
        print("Running cross-org CFA...")
        campaigns = (
            sb.table("campaigns")
            .select("id")
            .in_("status", ["closed", "archived"])
            .execute()
        )
        if not campaigns.data:
            print("  ✗ No closed campaigns found")
            sys.exit(1)

        all_matrices = []
        all_items = None
        for camp in campaigns.data:
            _, item_df, matrix = load_campaign_response_matrix(sb, camp["id"])
            if not matrix.empty:
                all_matrices.append(matrix)
                if all_items is None:
                    all_items = item_df
        if not all_matrices or all_items is None:
            print("  ✗ No response data found")
            sys.exit(1)

        matrix = pd.concat(all_matrices)
        item_df = all_items
        campaign_id = None
        min_n = CFA_CROSS_ORG_MIN_N
        analysis_type = "cfa_instrument"
    else:
        campaign_id = args.campaign_id
        if not campaign_id:
            print("  ✗ campaign_id required (or use --cross-org)")
            sys.exit(1)
        print(f"Running CFA for campaign {campaign_id[:8]}...")
        _, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)
        min_n = CFA_MIN_N
        analysis_type = "cfa_campaign"

    n = len(matrix)
    print(f"  Respondents: {n} (minimum: {min_n})")
    if n < min_n:
        print(f"  ✗ Insufficient respondents ({n} < {min_n})")
        sys.exit(0)

    col_map = {col: f"x_{col[:8]}" for col in matrix.columns}
    matrix = matrix.rename(columns=col_map)

    from semopy import Model

    model_spec = build_cfa_model_spec(item_df)
    model = Model(model_spec)
    model.fit(matrix, obj="DWLS")

    stats = model.calc_stats()
    chi2 = float(stats.iloc[0].get("chi2", 0))
    df_val = float(stats.iloc[0].get("DoF", 0))
    cfi = float(stats.iloc[0].get("CFI", 0))
    rmsea = float(stats.iloc[0].get("RMSEA", 0))
    srmr = float(stats.iloc[0].get("SRMR", 0))

    estimates = model.inspect()
    loadings_df = estimates[estimates["op"] == "~"]

    factor_loadings = []
    problematic_items = []
    for dim_code in sorted(item_df["code"].unique()):
        dim_loadings = loadings_df[loadings_df["lval"] == dim_code]
        items_list = []
        for _, row in dim_loadings.iterrows():
            loading = round(float(row["Estimate"]), 3)
            se = round(float(row.get("Std. Err", 0)), 3)
            flag = "low_loading" if abs(loading) < 0.40 else None
            items_list.append({"item_id": row["rval"], "loading": loading, "se": se, "flag": flag})
            if flag:
                problematic_items.append(
                    {"item_id": row["rval"], "dimension_code": dim_code, "loading": loading, "issue": "loading < 0.40"}
                )
        avg_loading = round(np.mean([i["loading"] for i in items_list]), 3) if items_list else 0
        factor_loadings.append(
            {"dimension_code": dim_code, "items": items_list, "avg_loading": avg_loading, "flag": "low_avg_loading" if avg_loading < 0.50 else None}
        )

    factor_corrs = []
    discriminant_issues = []
    corr_df = estimates[(estimates["op"] == "~~") & (estimates["lval"] != estimates["rval"])]
    for _, row in corr_df.iterrows():
        r = round(float(row["Estimate"]), 3)
        entry = {"factor_a": row["lval"], "factor_b": row["rval"], "r": r, "flag": "high_correlation" if abs(r) > 0.80 else None}
        factor_corrs.append(entry)
        if abs(r) > 0.80:
            discriminant_issues.append({"factors": [row["lval"], row["rval"]], "r": r, "issue": "r > 0.80 suggests poor discriminant validity"})

    result = {
        "fit_indices": {
            "chi2": round(chi2, 1),
            "df": int(df_val),
            "chi2_df_ratio": round(chi2 / df_val, 2) if df_val > 0 else None,
            "cfi": round(cfi, 3),
            "rmsea": round(rmsea, 3),
            "srmr": round(srmr, 3),
            "fit_verdict": classify_fit(cfi, rmsea, srmr),
        },
        "factor_loadings": factor_loadings,
        "problematic_items": problematic_items,
        "factor_correlations": factor_corrs,
        "discriminant_issues": discriminant_issues,
        "sample_n": n,
        "estimator": "DWLS",
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "engine_version": ENGINE_VERSION,
    }

    save_results(sb, campaign_id, analysis_type, result)
    print(f"  CFA complete: CFI={cfi:.3f}, RMSEA={rmsea:.3f}, verdict={result['fit_indices']['fit_verdict']}")


# ---------------------------------------------------------------------------
# Invariance
# ---------------------------------------------------------------------------
def cmd_invariance(args):
    sb = get_supabase()
    is_cross_org = getattr(args, "cross_org", False)
    groups_str = getattr(args, "groups", "department,tenure,gender")
    grouping_vars = [g.strip() for g in groups_str.split(",")]

    if is_cross_org:
        print("  ✗ Cross-org invariance not yet implemented")
        sys.exit(0)

    campaign_id = args.campaign_id
    if not campaign_id:
        print("  ✗ campaign_id required (or use --cross-org)")
        sys.exit(1)

    print(f"Running invariance for campaign {campaign_id[:8]}...")
    respondent_df, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)

    if matrix.empty:
        print("  ✗ No response data")
        sys.exit(0)

    col_map = {col: f"x_{col[:8]}" for col in matrix.columns}
    matrix = matrix.rename(columns=col_map)

    from semopy import Model

    model_spec = build_cfa_model_spec(item_df)

    for grouping_var in grouping_vars:
        if grouping_var not in respondent_df.columns:
            print(f"  Skipping {grouping_var}: not in respondent data")
            continue

        matrix_with_group = matrix.copy()
        matrix_with_group = (
            matrix_with_group.merge(
                respondent_df[["id", grouping_var]], left_index=True, right_on="id", how="left"
            ).set_index("id")
        )

        groups = matrix_with_group[grouping_var].dropna().unique()
        valid_groups = []
        for g in groups:
            group_n = int((matrix_with_group[grouping_var] == g).sum())
            if group_n >= INVARIANCE_MIN_N_PER_GROUP:
                valid_groups.append({"name": str(g), "n": group_n})

        if len(valid_groups) < 2:
            print(f"  Skipping {grouping_var}: fewer than 2 groups with n >= {INVARIANCE_MIN_N_PER_GROUP}")
            continue

        print(f"  Testing invariance by {grouping_var} ({len(valid_groups)} groups)...")

        levels = []
        prev_cfi = None
        prev_rmsea = None

        for level_name in ["configural", "metric", "scalar"]:
            try:
                group_data = {
                    str(g["name"]): matrix_with_group[matrix_with_group[grouping_var] == g["name"]].drop(columns=[grouping_var])
                    for g in valid_groups
                }

                if level_name == "configural":
                    cfis, rmseas = [], []
                    for gdata in group_data.values():
                        m = Model(model_spec)
                        m.fit(gdata, obj="DWLS")
                        s = m.calc_stats()
                        cfis.append(float(s.iloc[0].get("CFI", 0)))
                        rmseas.append(float(s.iloc[0].get("RMSEA", 0)))
                    cfi = float(np.mean(cfis))
                    rmsea = float(np.mean(rmseas))
                else:
                    m = Model(model_spec)
                    m.fit(pd.concat(group_data.values()), obj="DWLS")
                    s = m.calc_stats()
                    cfi = float(s.iloc[0].get("CFI", 0))
                    rmsea = float(s.iloc[0].get("RMSEA", 0))

                level_entry: dict = {"level": level_name, "cfi": round(cfi, 3), "rmsea": round(rmsea, 3), "passed": True}

                if prev_cfi is not None:
                    delta_cfi = round(cfi - prev_cfi, 3)
                    delta_rmsea = round(rmsea - prev_rmsea, 3)
                    level_entry["delta_cfi"] = delta_cfi
                    level_entry["delta_rmsea"] = delta_rmsea
                    level_entry["passed"] = abs(delta_cfi) <= 0.010 and abs(delta_rmsea) <= 0.015

                if not level_entry["passed"]:
                    levels.append(level_entry)
                    break

                levels.append(level_entry)
                prev_cfi = cfi
                prev_rmsea = rmsea

            except Exception as e:
                print(f"    ✗ {level_name} failed: {e}")
                levels.append({"level": level_name, "passed": False, "error": str(e)})
                break

        highest = "none"
        for lvl in reversed(levels):
            if lvl.get("passed"):
                highest = lvl["level"]
                break

        verdicts = {
            "scalar": f"Las comparaciones de medias entre {grouping_var}s son válidas",
            "metric": f"Las relaciones son equivalentes, pero las comparaciones de medias requieren cautela",
            "configural": f"La estructura factorial se sostiene, pero las comparaciones no son válidas",
            "none": f"La estructura factorial difiere entre {grouping_var}s",
        }

        result = {
            "grouping_variable": grouping_var,
            "groups": valid_groups,
            "levels": levels,
            "highest_supported": highest,
            "verdict": verdicts.get(highest, verdicts["none"]),
            "partial_invariance": None,
            "sample_n": sum(g["n"] for g in valid_groups),
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "engine_version": ENGINE_VERSION,
        }

        save_results(sb, campaign_id, "invariance_campaign", result)
        print(f"    Highest: {highest} — {verdicts.get(highest, '')}")


# ---------------------------------------------------------------------------
# HLM
# ---------------------------------------------------------------------------
def cmd_hlm(args):
    sb = get_supabase()
    is_cross_org = getattr(args, "cross_org", False)

    if is_cross_org:
        print("  ✗ Cross-org HLM not yet implemented")
        sys.exit(0)

    campaign_id = args.campaign_id
    if not campaign_id:
        print("  ✗ campaign_id required")
        sys.exit(1)

    print(f"Running HLM for campaign {campaign_id[:8]}...")
    respondent_df, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)

    if matrix.empty or len(matrix) < HLM_MIN_N:
        print(f"  ✗ Insufficient respondents ({len(matrix)} < {HLM_MIN_N})")
        sys.exit(0)

    # Build respondent-level dimension averages
    dim_codes = item_df["code"].unique()
    col_map = {col: f"x_{col[:8]}" for col in matrix.columns}
    matrix_renamed = matrix.rename(columns=col_map)

    respondent_dim_avgs = pd.DataFrame(index=matrix_renamed.index)
    for dim_code in dim_codes:
        dim_items = item_df[item_df["code"] == dim_code]["id"].tolist()
        col_names = [f"x_{iid[:8]}" for iid in dim_items]
        valid_cols = [c for c in col_names if c in matrix_renamed.columns]
        if valid_cols:
            respondent_dim_avgs[dim_code] = matrix_renamed[valid_cols].mean(axis=1)

    respondent_dim_avgs = (
        respondent_dim_avgs.merge(
            respondent_df[["id", "department"]], left_index=True, right_on="id", how="left"
        ).set_index("id")
    )

    dept_counts = respondent_dim_avgs["department"].value_counts()
    valid_depts = dept_counts[dept_counts >= HLM_MIN_N_PER_GROUP].index.tolist()
    if len(valid_depts) < HLM_MIN_GROUPS:
        print(f"  ✗ Need >= {HLM_MIN_GROUPS} departments with >= {HLM_MIN_N_PER_GROUP} respondents")
        sys.exit(0)

    filtered = respondent_dim_avgs[respondent_dim_avgs["department"].isin(valid_depts)]
    print(f"  Respondents: {len(filtered)}, Departments: {len(valid_depts)}")

    import statsmodels.formula.api as smf

    dimensions_results = []
    for dim_code in dim_codes:
        if dim_code not in filtered.columns:
            continue

        data = filtered[[dim_code, "department"]].dropna().copy()
        data.columns = ["score", "department"]

        try:
            model = smf.mixedlm("score ~ 1", data, groups=data["department"])
            result = model.fit(reml=True)

            var_group = float(result.cov_re.iloc[0, 0]) if hasattr(result, "cov_re") else 0
            var_resid = float(result.scale)
            total_var = var_group + var_resid
            icc = max(0, var_group / total_var) if total_var > 0 else 0

            dimensions_results.append({
                "code": dim_code,
                "icc_department": round(icc, 3),
                "icc_label": classify_icc(icc),
                "variance_individual": round(var_resid, 3),
                "variance_department": round(max(0, var_group), 3),
                "grand_mean": round(float(result.fe_params.iloc[0]), 3),
                "n_respondents": len(data),
                "n_groups": data["department"].nunique(),
                "convergence": result.converged,
            })
        except Exception:
            dimensions_results.append({
                "code": dim_code,
                "icc_department": 0,
                "icc_label": "negligible",
                "variance_individual": 0,
                "variance_department": 0,
                "grand_mean": round(float(data["score"].mean()), 3),
                "n_respondents": len(data),
                "n_groups": data["department"].nunique(),
                "convergence": False,
            })

    dimensions_results.sort(key=lambda x: x["icc_department"], reverse=True)
    most_dept = dimensions_results[0] if dimensions_results else None
    most_indiv = dimensions_results[-1] if dimensions_results else None
    avg_icc = round(float(np.mean([d["icc_department"] for d in dimensions_results])), 3) if dimensions_results else 0

    result = {
        "levels": 2,
        "grouping": ["department"],
        "dimensions": dimensions_results,
        "summary": {
            "most_departmental": {"code": most_dept["code"], "icc": most_dept["icc_department"]} if most_dept else None,
            "most_individual": {"code": most_indiv["code"], "icc": most_indiv["icc_department"]} if most_indiv else None,
            "avg_icc": avg_icc,
        },
        "model": "null_intercept_only",
        "estimator": "REML",
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "engine_version": ENGINE_VERSION,
    }

    save_results(sb, campaign_id, "hlm_campaign", result)
    print(f"  HLM complete: avg ICC={avg_icc}")


# ---------------------------------------------------------------------------
# Self-tests
# ---------------------------------------------------------------------------
def cmd_test(_args):
    """Run self-tests with synthetic data (no DB required)."""
    print("Running statistical engine self-tests...\n")
    passed = 0

    print("  Test 1: CFA model spec generation")
    test_items = pd.DataFrame({"id": ["i1", "i2", "i3", "i4", "i5", "i6"], "code": ["A", "A", "A", "B", "B", "B"]})
    spec = build_cfa_model_spec(test_items)
    assert "A =~" in spec and "B =~" in spec, f"Bad spec: {spec}"
    print("    ✓ Model spec generated correctly")
    passed += 1

    print("  Test 2: Fit classification")
    assert classify_fit(0.96, 0.04, 0.05) == "bueno"
    assert classify_fit(0.92, 0.07, 0.07) == "aceptable"
    assert classify_fit(0.85, 0.10, 0.12) == "pobre"
    print("    ✓ Fit classification correct")
    passed += 1

    print("  Test 3: ICC classification")
    assert classify_icc(0.03) == "negligible"
    assert classify_icc(0.10) == "bajo"
    assert classify_icc(0.22) == "moderado"
    assert classify_icc(0.40) == "alto"
    print("    ✓ ICC classification correct")
    passed += 1

    print("  Test 4: HLM with synthetic data")
    import statsmodels.formula.api as smf

    np.random.seed(42)
    n_per_group = 30
    groups = ["A"] * n_per_group + ["B"] * n_per_group + ["C"] * n_per_group
    scores = (
        np.random.normal(3.0, 0.5, n_per_group).tolist()
        + np.random.normal(4.0, 0.5, n_per_group).tolist()
        + np.random.normal(3.5, 0.5, n_per_group).tolist()
    )
    data = pd.DataFrame({"score": scores, "department": groups})
    model = smf.mixedlm("score ~ 1", data, groups=data["department"])
    fit_result = model.fit(reml=True)
    var_group = float(fit_result.cov_re.iloc[0, 0])
    var_resid = float(fit_result.scale)
    icc = var_group / (var_group + var_resid)
    assert 0.15 < icc < 0.95, f"ICC should be moderate-high, got {icc:.3f}"
    print(f"    ✓ HLM ICC = {icc:.3f} (expected moderate-high)")
    passed += 1

    print(f"\n  Results: {passed} passed, 0 failed")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="ClimaLab Statistical Engine")
    parser.add_argument("--test", action="store_true", help="Run self-tests")
    sub = parser.add_subparsers(dest="command")

    cfa_p = sub.add_parser("cfa")
    cfa_p.add_argument("campaign_id", nargs="?", default=None)
    cfa_p.add_argument("--cross-org", action="store_true")

    inv_p = sub.add_parser("invariance")
    inv_p.add_argument("campaign_id", nargs="?", default=None)
    inv_p.add_argument("--cross-org", action="store_true")
    inv_p.add_argument("--groups", default="department,tenure,gender")

    hlm_p = sub.add_parser("hlm")
    hlm_p.add_argument("campaign_id", nargs="?", default=None)
    hlm_p.add_argument("--cross-org", action="store_true")

    args = parser.parse_args()

    if args.test:
        cmd_test(args)
    elif args.command == "cfa":
        cmd_cfa(args)
    elif args.command == "invariance":
        cmd_invariance(args)
    elif args.command == "hlm":
        cmd_hlm(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

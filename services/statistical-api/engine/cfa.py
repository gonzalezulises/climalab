"""CFA — Confirmatory Factor Analysis for ClimaLab campaigns."""

from datetime import datetime, timezone

import numpy as np
import pandas as pd
from semopy import Model

from engine.data import get_supabase, load_campaign_response_matrix, save_results

ENGINE_VERSION = "1.0.0"
CFA_MIN_N = 100


def build_cfa_model_spec(item_df: pd.DataFrame) -> str:
    """Generate semopy model specification from item-dimension mapping."""
    dim_items = item_df.groupby("code")["id"].apply(list).to_dict()
    lines = []
    for dim_code, item_ids in sorted(dim_items.items()):
        indicators = " + ".join(f"x_{iid[:8]}" for iid in item_ids)
        lines.append(f"{dim_code} =~ {indicators}")
    return "\n".join(lines)


def classify_fit(cfi: float, rmsea: float, srmr: float) -> str:
    """Classify model fit based on standard thresholds."""
    if cfi >= 0.95 and rmsea <= 0.06 and srmr <= 0.08:
        return "bueno"
    if cfi >= 0.90 and rmsea <= 0.08:
        return "aceptable"
    return "pobre"


def run_cfa(campaign_id: str) -> dict:
    """Run CFA for a single campaign. Returns results dict."""
    sb = get_supabase()

    _, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)

    n = len(matrix)
    if n < CFA_MIN_N:
        raise ValueError(
            f"Respondientes insuficientes para CFA ({n} < {CFA_MIN_N})"
        )

    col_map = {col: f"x_{col[:8]}" for col in matrix.columns}
    matrix = matrix.rename(columns=col_map)

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
            items_list.append({
                "item_id": row["rval"],
                "loading": loading,
                "se": se,
                "flag": flag,
            })
            if flag:
                problematic_items.append({
                    "item_id": row["rval"],
                    "dimension_code": dim_code,
                    "loading": loading,
                    "issue": "loading < 0.40",
                })
        avg_loading = (
            round(np.mean([i["loading"] for i in items_list]), 3)
            if items_list
            else 0
        )
        factor_loadings.append({
            "dimension_code": dim_code,
            "items": items_list,
            "avg_loading": avg_loading,
            "flag": "low_avg_loading" if avg_loading < 0.50 else None,
        })

    factor_corrs = []
    discriminant_issues = []
    corr_df = estimates[
        (estimates["op"] == "~~") & (estimates["lval"] != estimates["rval"])
    ]
    for _, row in corr_df.iterrows():
        r = round(float(row["Estimate"]), 3)
        entry = {
            "factor_a": row["lval"],
            "factor_b": row["rval"],
            "r": r,
            "flag": "high_correlation" if abs(r) > 0.80 else None,
        }
        factor_corrs.append(entry)
        if abs(r) > 0.80:
            discriminant_issues.append({
                "factors": [row["lval"], row["rval"]],
                "r": r,
                "issue": "r > 0.80 suggests poor discriminant validity",
            })

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

    save_results(sb, campaign_id, "cfa_campaign", result)

    return result

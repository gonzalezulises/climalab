"""HLM — Hierarchical Linear Modeling for ClimaLab campaigns."""

from datetime import datetime, timezone

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

from engine.data import get_supabase, load_campaign_response_matrix, save_results

ENGINE_VERSION = "1.0.0"
HLM_MIN_N = 50
HLM_MIN_GROUPS = 3
HLM_MIN_N_PER_GROUP = 10


def classify_icc(icc: float) -> str:
    """Classify ICC magnitude."""
    if icc < 0.05:
        return "negligible"
    if icc < 0.15:
        return "bajo"
    if icc < 0.30:
        return "moderado"
    return "alto"


def run_hlm(campaign_id: str) -> dict:
    """Run HLM (null model) for a campaign. Returns results dict."""
    sb = get_supabase()

    respondent_df, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)

    if matrix.empty or len(matrix) < HLM_MIN_N:
        raise ValueError(
            f"Respondientes insuficientes para HLM ({len(matrix) if not matrix.empty else 0} < {HLM_MIN_N})"
        )

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
            respondent_df[["id", "department"]],
            left_index=True,
            right_on="id",
            how="left",
        ).set_index("id")
    )

    dept_counts = respondent_dim_avgs["department"].value_counts()
    valid_depts = dept_counts[dept_counts >= HLM_MIN_N_PER_GROUP].index.tolist()
    if len(valid_depts) < HLM_MIN_GROUPS:
        raise ValueError(
            f"Se necesitan >= {HLM_MIN_GROUPS} departamentos con >= {HLM_MIN_N_PER_GROUP} respondientes"
        )

    filtered = respondent_dim_avgs[
        respondent_dim_avgs["department"].isin(valid_depts)
    ]

    dimensions_results = []
    for dim_code in dim_codes:
        if dim_code not in filtered.columns:
            continue

        data = filtered[[dim_code, "department"]].dropna().copy()
        data.columns = ["score", "department"]

        try:
            model = smf.mixedlm("score ~ 1", data, groups=data["department"])
            result = model.fit(reml=True)

            var_group = (
                float(result.cov_re.iloc[0, 0])
                if hasattr(result, "cov_re")
                else 0
            )
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
    avg_icc = (
        round(
            float(np.mean([d["icc_department"] for d in dimensions_results])),
            3,
        )
        if dimensions_results
        else 0
    )

    result = {
        "levels": 2,
        "grouping": ["department"],
        "dimensions": dimensions_results,
        "summary": {
            "most_departmental": (
                {"code": most_dept["code"], "icc": most_dept["icc_department"]}
                if most_dept
                else None
            ),
            "most_individual": (
                {"code": most_indiv["code"], "icc": most_indiv["icc_department"]}
                if most_indiv
                else None
            ),
            "avg_icc": avg_icc,
        },
        "model": "null_intercept_only",
        "estimator": "REML",
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "engine_version": ENGINE_VERSION,
    }

    save_results(sb, campaign_id, "hlm_campaign", result)

    return result

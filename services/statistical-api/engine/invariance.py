"""Measurement Invariance testing for ClimaLab campaigns."""

from datetime import datetime, timezone

import numpy as np
import pandas as pd
from semopy import Model

from engine.data import get_supabase, load_campaign_response_matrix, save_results
from engine.cfa import build_cfa_model_spec

ENGINE_VERSION = "1.0.0"
INVARIANCE_MIN_N_PER_GROUP = 75


def run_invariance(
    campaign_id: str, groups: str = "department,tenure,gender"
) -> dict:
    """Run measurement invariance for a campaign across grouping variables.

    Returns dict with results for each grouping variable tested.
    """
    sb = get_supabase()
    grouping_vars = [g.strip() for g in groups.split(",")]

    respondent_df, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)

    if matrix.empty:
        raise ValueError("No hay datos de respuesta para esta campaña")

    col_map = {col: f"x_{col[:8]}" for col in matrix.columns}
    matrix = matrix.rename(columns=col_map)

    model_spec = build_cfa_model_spec(item_df)

    all_results = {}

    for grouping_var in grouping_vars:
        if grouping_var not in respondent_df.columns:
            continue

        matrix_with_group = matrix.copy()
        matrix_with_group = (
            matrix_with_group.merge(
                respondent_df[["id", grouping_var]],
                left_index=True,
                right_on="id",
                how="left",
            ).set_index("id")
        )

        group_values = matrix_with_group[grouping_var].dropna().unique()
        valid_groups = []
        for gv in group_values:
            group_n = int((matrix_with_group[grouping_var] == gv).sum())
            if group_n >= INVARIANCE_MIN_N_PER_GROUP:
                valid_groups.append({"name": str(gv), "n": group_n})

        if len(valid_groups) < 2:
            continue

        levels = []
        prev_cfi = None
        prev_rmsea = None

        for level_name in ["configural", "metric", "scalar"]:
            try:
                group_data = {
                    str(g["name"]): matrix_with_group[
                        matrix_with_group[grouping_var] == g["name"]
                    ].drop(columns=[grouping_var])
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

                level_entry: dict = {
                    "level": level_name,
                    "cfi": round(cfi, 3),
                    "rmsea": round(rmsea, 3),
                    "passed": True,
                }

                if prev_cfi is not None:
                    delta_cfi = round(cfi - prev_cfi, 3)
                    delta_rmsea = round(rmsea - prev_rmsea, 3)
                    level_entry["delta_cfi"] = delta_cfi
                    level_entry["delta_rmsea"] = delta_rmsea
                    level_entry["passed"] = (
                        abs(delta_cfi) <= 0.010 and abs(delta_rmsea) <= 0.015
                    )

                if not level_entry["passed"]:
                    levels.append(level_entry)
                    break

                levels.append(level_entry)
                prev_cfi = cfi
                prev_rmsea = rmsea

            except Exception as e:
                levels.append({
                    "level": level_name,
                    "passed": False,
                    "error": str(e),
                })
                break

        highest = "none"
        for lvl in reversed(levels):
            if lvl.get("passed"):
                highest = lvl["level"]
                break

        verdicts = {
            "scalar": f"Las comparaciones de medias entre {grouping_var}s son validas",
            "metric": f"Las relaciones son equivalentes, pero las comparaciones de medias requieren cautela",
            "configural": f"La estructura factorial se sostiene, pero las comparaciones no son validas",
            "none": f"La estructura factorial difiere entre {grouping_var}s",
        }

        var_result = {
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

        save_results(sb, campaign_id, "invariance_campaign", var_result)
        all_results[grouping_var] = var_result

    if not all_results:
        raise ValueError(
            f"Grupos insuficientes para invarianza (min {INVARIANCE_MIN_N_PER_GROUP} por grupo, min 2 grupos)"
        )

    return all_results

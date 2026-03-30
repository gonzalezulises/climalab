"""Shared data loading module for the statistical API."""

import json
import os

import numpy as np
import pandas as pd
from supabase import create_client, Client


SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0"
    ".EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
)


def get_supabase() -> Client:
    """Create a Supabase client from environment variables."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def load_campaign_response_matrix(
    sb: Client, campaign_id: str, exclude_eng: bool = False
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load respondents, items, and build respondent x item score matrix.

    Args:
        sb: Supabase client.
        campaign_id: Campaign UUID.
        exclude_eng: If True, exclude ENG dimension items from matrix.

    Returns:
        (respondent_df, item_df, matrix) where matrix is respondent x item
        with reverse items already inverted (6 - score).
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

    camp = (
        sb.table("campaigns")
        .select("instrument_id, module_instrument_ids")
        .eq("id", campaign_id)
        .single()
        .execute()
    )
    instrument_ids = [camp.data["instrument_id"]] + (
        camp.data.get("module_instrument_ids") or []
    )

    dims = (
        sb.table("dimensions")
        .select("id, code, category")
        .in_("instrument_id", instrument_ids)
        .execute()
    )
    dim_df = pd.DataFrame(dims.data)

    if exclude_eng:
        dim_df = dim_df[dim_df["code"] != "ENG"]

    items_resp = (
        sb.table("items")
        .select("id, dimension_id, is_reverse, is_attention_check")
        .in_("dimension_id", dim_df["id"].tolist())
        .eq("is_attention_check", False)
        .execute()
    )
    item_df = pd.DataFrame(items_resp.data)
    item_df = item_df.merge(
        dim_df[["id", "code"]],
        left_on="dimension_id",
        right_on="id",
        suffixes=("", "_dim"),
    )

    rids = respondent_df["id"].tolist()
    all_responses: list[dict] = []
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
        lambda row: 6 - row["score"] if row["is_reverse"] else row["score"],
        axis=1,
    )

    matrix = response_df.pivot_table(
        index="respondent_id",
        columns="item_id",
        values="adjusted_score",
        aggfunc="first",
    )

    return respondent_df, item_df, matrix


def save_results(
    sb: Client, campaign_id: str, analysis_type: str, data: dict
) -> None:
    """Save analysis results to campaign_analytics, replacing previous."""
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

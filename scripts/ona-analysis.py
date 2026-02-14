#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "supabase>=2.0.0",
#     "networkx>=3.0",
#     "numpy>=1.24",
#     "pandas>=2.0",
#     "scipy>=1.10",
# ]
# ///
"""
ONA — Perceptual Network Analysis for ClimaLab campaigns.

Builds a cosine-similarity graph from respondent dimension-score vectors,
detects communities (Louvain), computes centrality metrics, and stores
the results in campaign_analytics as analysis_type = 'ona_network'.

Usage:
    uv run scripts/ona-analysis.py                  # all closed/archived campaigns
    uv run scripts/ona-analysis.py <campaign_id>    # single campaign
"""

import os
import sys
from datetime import datetime, timezone

import networkx as nx
import numpy as np
import pandas as pd
from scipy.spatial.distance import cosine as cosine_dist
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get(
    "NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321"
)
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0"
    ".EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
)

MIN_RESPONDENTS = 10
ENG_CODE = "ENG"  # excluded from similarity vectors (dependent variable)


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# 1. Fetch campaign data and build dimension-score vectors
# ---------------------------------------------------------------------------
def fetch_campaign_data(
    sb: Client, campaign_id: str
) -> tuple[pd.DataFrame, list[str]] | None:
    """Return (respondent_vectors DataFrame, dim_codes list) or None."""

    # Campaign + instrument ids
    camp = (
        sb.table("campaigns")
        .select("instrument_id, module_instrument_ids")
        .eq("id", campaign_id)
        .single()
        .execute()
    )
    if not camp.data:
        print(f"  Campaign {campaign_id} not found")
        return None

    instrument_ids = [camp.data["instrument_id"]] + (
        camp.data.get("module_instrument_ids") or []
    )

    # Dimensions (exclude ENG — it is the DV)
    dims = (
        sb.table("dimensions")
        .select("id, code, instrument_id")
        .in_("instrument_id", instrument_ids)
        .execute()
    )
    dim_rows = [d for d in (dims.data or []) if d["code"] != ENG_CODE]
    if not dim_rows:
        print("  No dimensions found")
        return None
    dim_codes = sorted(set(d["code"] for d in dim_rows))
    dim_id_to_code = {d["id"]: d["code"] for d in dim_rows}

    # Items mapped to dimension codes
    items = (
        sb.table("items")
        .select("id, dimension_id, is_reverse, is_attention_check")
        .in_("dimension_id", list(dim_id_to_code.keys()))
        .execute()
    )
    item_map: dict[str, dict] = {}
    for it in items.data or []:
        if it["is_attention_check"]:
            continue
        dim_code = dim_id_to_code.get(it["dimension_id"])
        if dim_code:
            item_map[it["id"]] = {
                "code": dim_code,
                "reverse": it["is_reverse"],
            }

    # Valid respondents
    respondents = (
        sb.table("respondents")
        .select("id, department")
        .eq("campaign_id", campaign_id)
        .eq("status", "completed")
        .execute()
    )
    resp_list = respondents.data or []
    if len(resp_list) < MIN_RESPONDENTS:
        print(f"  Only {len(resp_list)} valid respondents (min {MIN_RESPONDENTS})")
        return None

    resp_ids = [r["id"] for r in resp_list]
    dept_map = {r["id"]: r.get("department") or "Sin departamento" for r in resp_list}

    # Responses (batched)
    all_responses: list[dict] = []
    for i in range(0, len(resp_ids), 50):
        batch = resp_ids[i : i + 50]
        res = (
            sb.table("responses")
            .select("respondent_id, item_id, score")
            .in_("respondent_id", batch)
            .execute()
        )
        all_responses.extend(res.data or [])

    # Build per-respondent dimension score vectors
    # {resp_id: {dim_code: [adjusted scores]}}
    resp_dim_scores: dict[str, dict[str, list[float]]] = {
        rid: {c: [] for c in dim_codes} for rid in resp_ids
    }
    for r in all_responses:
        info = item_map.get(r["item_id"])
        if not info:
            continue
        score = r["score"]
        if info["reverse"]:
            score = 6 - score
        resp_dim_scores[r["respondent_id"]][info["code"]].append(float(score))

    # Average per dimension → vector
    rows = []
    for rid in resp_ids:
        vec = {}
        valid = True
        for code in dim_codes:
            scores = resp_dim_scores[rid][code]
            if not scores:
                valid = False
                break
            vec[code] = float(np.mean(scores))
        if valid:
            vec["_id"] = rid
            vec["_dept"] = dept_map[rid]
            rows.append(vec)

    if len(rows) < MIN_RESPONDENTS:
        print(f"  Only {len(rows)} respondents with complete vectors (min {MIN_RESPONDENTS})")
        return None

    df = pd.DataFrame(rows)
    print(f"  Vectors: {len(df)} respondents × {len(dim_codes)} dimensions")
    return df, dim_codes


# ---------------------------------------------------------------------------
# 2. Build similarity graph with adaptive threshold
# ---------------------------------------------------------------------------
def build_similarity_graph(
    df: pd.DataFrame, dim_codes: list[str]
) -> nx.Graph:
    """Cosine similarity graph with adaptive threshold targeting 10-30% density."""
    vectors = df[dim_codes].values  # (n, d)
    n = len(vectors)

    # Compute full similarity matrix
    sim_matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            sim = 1.0 - cosine_dist(vectors[i], vectors[j])
            sim_matrix[i, j] = sim
            sim_matrix[j, i] = sim
        sim_matrix[i, i] = 1.0

    # Adaptive threshold via binary search targeting 10-30% edge density
    upper_tri = sim_matrix[np.triu_indices(n, k=1)]
    max_edges = n * (n - 1) / 2
    lo, hi = float(np.min(upper_tri)), float(np.max(upper_tri))
    best_threshold = (lo + hi) / 2

    for _ in range(40):
        mid = (lo + hi) / 2
        edge_count = int(np.sum(upper_tri >= mid))
        density = edge_count / max_edges if max_edges > 0 else 0
        if 0.10 <= density <= 0.30:
            best_threshold = mid
            break
        elif density < 0.10:
            hi = mid  # threshold too high → lower it
        else:
            lo = mid  # density too high → raise threshold
        best_threshold = mid
        if hi - lo < 1e-6:
            break

    # Build graph
    G = nx.Graph()
    ids = df["_id"].tolist()
    depts = df["_dept"].tolist()
    for i in range(n):
        G.add_node(ids[i], department=depts[i], index=i)
    for i in range(n):
        for j in range(i + 1, n):
            if sim_matrix[i, j] >= best_threshold:
                G.add_edge(ids[i], ids[j], weight=float(sim_matrix[i, j]))

    print(
        f"  Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, "
        f"threshold={best_threshold:.2f}, density={nx.density(G):.3f}"
    )
    return G


# ---------------------------------------------------------------------------
# 3. Compute ONA metrics
# ---------------------------------------------------------------------------
def compute_ona_metrics(
    G: nx.Graph, df: pd.DataFrame, dim_codes: list[str]
) -> dict:
    """Community detection, centrality, profiles, discriminants, bridges."""

    # Louvain communities
    communities = nx.community.louvain_communities(G, seed=42, weight="weight")
    community_map: dict[str, int] = {}
    for idx, comm in enumerate(communities):
        for node in comm:
            community_map[node] = idx

    # Add community attribute
    nx.set_node_attributes(G, community_map, "community")

    n_communities = len(communities)
    modularity = nx.community.modularity(G, communities, weight="weight")
    avg_clustering = nx.average_clustering(G, weight="weight")

    print(f"  Communities: {n_communities}, modularity={modularity:.3f}, clustering={avg_clustering:.3f}")

    # Centrality (handle disconnected graphs)
    try:
        eigenvector_cent = nx.eigenvector_centrality(
            G, max_iter=500, weight="weight"
        )
    except (nx.PowerIterationFailedConvergence, nx.AmbiguousSolution):
        eigenvector_cent = {n: 0.0 for n in G.nodes()}
    betweenness_cent = nx.betweenness_centrality(G, weight="weight")
    degree_cent = nx.degree_centrality(G)

    # Node metrics
    ids = df["_id"].tolist()
    depts = df["_dept"].tolist()
    id_to_dept = dict(zip(ids, depts))
    node_metrics = []
    for node in G.nodes():
        node_metrics.append(
            {
                "id": node[:8],  # anonymized
                "full_id": node,
                "department": id_to_dept.get(node, ""),
                "community": community_map.get(node, -1),
                "eigenvector": round(eigenvector_cent.get(node, 0), 4),
                "betweenness": round(betweenness_cent.get(node, 0), 4),
                "degree": round(degree_cent.get(node, 0), 4),
                "connections": G.degree(node),
            }
        )

    # Community profiles
    id_to_index = {row["_id"]: i for i, row in df.iterrows()}
    community_profiles = []
    global_means = {c: float(df[c].mean()) for c in dim_codes}

    for cidx, comm_nodes in enumerate(communities):
        comm_ids = list(comm_nodes)
        comm_indices = [id_to_index[nid] for nid in comm_ids if nid in id_to_index]
        comm_df = df.iloc[comm_indices]

        # Dimension scores
        dim_scores = {c: round(float(comm_df[c].mean()), 3) for c in dim_codes}
        avg_score = round(float(np.mean(list(dim_scores.values()))), 3)

        # Department distribution
        dept_counts = comm_df["_dept"].value_counts().to_dict()
        dept_dist = {
            k: {"count": int(v), "pct": round(v / len(comm_df) * 100, 1)}
            for k, v in dept_counts.items()
        }
        dominant_dept = max(dept_counts, key=dept_counts.get) if dept_counts else ""

        # Top 3 dimensions where this cluster differs most from global mean
        diffs = sorted(
            [(c, dim_scores[c] - global_means[c]) for c in dim_codes],
            key=lambda x: abs(x[1]),
            reverse=True,
        )
        top_diffs = [
            {"code": c, "diff": round(d, 3), "cluster_score": dim_scores[c]}
            for c, d in diffs[:3]
        ]

        community_profiles.append(
            {
                "id": cidx,
                "size": len(comm_ids),
                "pct": round(len(comm_ids) / G.number_of_nodes() * 100, 1),
                "avg_score": avg_score,
                "dominant_department": dominant_dept,
                "department_distribution": dept_dist,
                "dimension_scores": dim_scores,
                "top_differences": top_diffs,
            }
        )

    # Discriminant dimensions (spread = max - min cluster mean)
    discriminants = []
    for code in dim_codes:
        cluster_means = [p["dimension_scores"][code] for p in community_profiles]
        if len(cluster_means) < 2:
            continue
        spread = max(cluster_means) - min(cluster_means)
        best_cluster = int(np.argmax(cluster_means))
        worst_cluster = int(np.argmin(cluster_means))
        discriminants.append(
            {
                "code": code,
                "spread": round(spread, 3),
                "max_cluster": best_cluster,
                "max_value": round(max(cluster_means), 3),
                "min_cluster": worst_cluster,
                "min_value": round(min(cluster_means), 3),
            }
        )
    discriminants.sort(key=lambda x: x["spread"], reverse=True)

    # Department density heatmap (intra/inter department similarity)
    all_depts = sorted(set(depts))
    dept_density: dict[str, dict[str, float | None]] = {}
    for da in all_depts:
        dept_density[da] = {}
        nodes_a = [n for n in G.nodes() if id_to_dept.get(n) == da]
        for db in all_depts:
            nodes_b = [n for n in G.nodes() if id_to_dept.get(n) == db]
            if not nodes_a or not nodes_b:
                dept_density[da][db] = None
                continue
            # Count edges between groups / possible edges
            edge_count = 0
            if da == db:
                possible = len(nodes_a) * (len(nodes_a) - 1) / 2
                for i, na in enumerate(nodes_a):
                    for nb in nodes_a[i + 1 :]:
                        if G.has_edge(na, nb):
                            edge_count += 1
            else:
                possible = len(nodes_a) * len(nodes_b)
                for na in nodes_a:
                    for nb in nodes_b:
                        if G.has_edge(na, nb):
                            edge_count += 1
            dept_density[da][db] = (
                round(edge_count / possible, 3) if possible > 0 else None
            )

    # Bridge nodes: high betweenness + neighbors in multiple communities
    bridge_threshold = np.percentile(
        list(betweenness_cent.values()), 75
    ) if betweenness_cent else 0
    bridges = []
    for node in G.nodes():
        if betweenness_cent.get(node, 0) < bridge_threshold:
            continue
        neighbor_communities = set()
        for neighbor in G.neighbors(node):
            neighbor_communities.add(community_map.get(neighbor, -1))
        if len(neighbor_communities) >= 2:
            bridges.append(
                {
                    "id": node[:8],
                    "department": id_to_dept.get(node, ""),
                    "community": community_map.get(node, -1),
                    "betweenness": round(betweenness_cent[node], 4),
                    "communities_bridged": len(neighbor_communities),
                    "connections": G.degree(node),
                }
            )
    bridges.sort(key=lambda x: x["betweenness"], reverse=True)

    return {
        "summary": {
            "nodes": G.number_of_nodes(),
            "edges": G.number_of_edges(),
            "density": round(nx.density(G), 4),
            "communities": n_communities,
            "modularity": round(modularity, 4),
            "avg_clustering": round(avg_clustering, 4),
        },
        "communities": community_profiles,
        "discriminants": discriminants[:10],  # top 10
        "department_density": dept_density,
        "bridges": bridges[:20],  # top 20
        "global_means": {c: round(v, 3) for c, v in global_means.items()},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# 4. Save results to campaign_analytics
# ---------------------------------------------------------------------------
def save_results(sb: Client, campaign_id: str, data: dict) -> None:
    # Delete previous ONA result
    sb.table("campaign_analytics").delete().eq(
        "campaign_id", campaign_id
    ).eq("analysis_type", "ona_network").execute()

    sb.table("campaign_analytics").insert(
        {
            "campaign_id": campaign_id,
            "analysis_type": "ona_network",
            "data": data,
        }
    ).execute()
    print(f"  Saved ONA results for campaign {campaign_id}")


# ---------------------------------------------------------------------------
# 5. Main
# ---------------------------------------------------------------------------
def process_campaign(sb: Client, campaign_id: str) -> None:
    print(f"\n=== ONA Analysis: {campaign_id} ===")
    result = fetch_campaign_data(sb, campaign_id)
    if result is None:
        return
    df, dim_codes = result

    G = build_similarity_graph(df, dim_codes)
    if G.number_of_edges() == 0:
        print("  No edges — skipping")
        return

    metrics = compute_ona_metrics(G, df, dim_codes)
    save_results(sb, campaign_id, metrics)


def main() -> None:
    sb = get_supabase()

    if len(sys.argv) > 1:
        # Single campaign
        process_campaign(sb, sys.argv[1])
    else:
        # All closed/archived campaigns
        camps = (
            sb.table("campaigns")
            .select("id")
            .in_("status", ["closed", "archived"])
            .order("created_at")
            .execute()
        )
        if not camps.data:
            print("No closed campaigns found")
            return
        print(f"Found {len(camps.data)} campaigns to process")
        for c in camps.data:
            process_campaign(sb, c["id"])

    print("\nONA analysis complete!")


if __name__ == "__main__":
    main()

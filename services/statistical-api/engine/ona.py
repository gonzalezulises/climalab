"""ONA — Perceptual Network Analysis for ClimaLab campaigns.

Builds a cosine-similarity graph from respondent dimension-score vectors,
detects communities (Leiden with stability analysis), computes centrality
metrics, generates a static graph image, and stores results in
campaign_analytics as analysis_type = 'ona_network'.
"""

import base64
import io
import random as _random
from collections import defaultdict
from datetime import datetime, timezone

import igraph as ig
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.spatial.distance import pdist, squareform

from engine.data import get_supabase, save_results

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MIN_RESPONDENTS = 10
ENG_CODE = "ENG"
STABILITY_ITERATIONS = 50
RANDOM_SEED = 42

DENSITY_TARGET_MIN = 0.10
DENSITY_TARGET_MAX = 0.30

NMI_ROBUST_THRESHOLD = 0.80
NMI_MODERATE_THRESHOLD = 0.50
CLUSTER_COLORS = [
    "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
    "#ec4899", "#0ea5e9", "#f97316", "#14b8a6", "#a855f7",
]


def _init_deterministic_rng() -> None:
    """Set igraph's RNG to a seeded instance for reproducible results."""
    ig.set_random_number_generator(_random.Random(RANDOM_SEED))


# ---------------------------------------------------------------------------
# 1. Fetch campaign data
# ---------------------------------------------------------------------------
def fetch_campaign_data(
    sb, campaign_id: str
) -> tuple[pd.DataFrame, list[str]] | None:
    """Return (respondent_vectors DataFrame, dim_codes list) or None.

    DataFrame columns: dim_codes + ['_id', '_dept', '_tenure', '_gender']
    """
    camp = (
        sb.table("campaigns")
        .select("instrument_id, module_instrument_ids")
        .eq("id", campaign_id)
        .single()
        .execute()
    )
    if not camp.data:
        return None

    instrument_ids = [camp.data["instrument_id"]] + (
        camp.data.get("module_instrument_ids") or []
    )

    dims = (
        sb.table("dimensions")
        .select("id, code, instrument_id")
        .in_("instrument_id", instrument_ids)
        .execute()
    )
    dim_rows = [d for d in (dims.data or []) if d["code"] != ENG_CODE]
    if not dim_rows:
        return None
    dim_codes = sorted(set(d["code"] for d in dim_rows))
    dim_id_to_code = {d["id"]: d["code"] for d in dim_rows}

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
            item_map[it["id"]] = {"code": dim_code, "reverse": it["is_reverse"]}

    respondents = (
        sb.table("respondents")
        .select("id, department, tenure, gender")
        .eq("campaign_id", campaign_id)
        .eq("status", "completed")
        .execute()
    )
    resp_list = respondents.data or []
    if len(resp_list) < MIN_RESPONDENTS:
        return None

    resp_ids = [r["id"] for r in resp_list]
    meta_map = {r["id"]: r for r in resp_list}

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
            vec["_dept"] = meta_map[rid].get("department") or "Sin departamento"
            vec["_tenure"] = meta_map[rid].get("tenure") or ""
            vec["_gender"] = meta_map[rid].get("gender") or ""
            rows.append(vec)

    if len(rows) < MIN_RESPONDENTS:
        return None

    df = pd.DataFrame(rows)
    return df, dim_codes


# ---------------------------------------------------------------------------
# 2. Build similarity graph
# ---------------------------------------------------------------------------
def build_similarity_graph(
    df: pd.DataFrame, dim_codes: list[str]
) -> ig.Graph:
    """Cosine similarity graph with adaptive threshold targeting 10-30% density."""
    vectors = df[dim_codes].values
    n = len(vectors)

    dists = pdist(vectors, metric="cosine")
    sim_matrix = 1.0 - squareform(dists)
    np.fill_diagonal(sim_matrix, 1.0)

    upper_tri = sim_matrix[np.triu_indices(n, k=1)]
    max_edges = n * (n - 1) / 2
    lo, hi = float(np.min(upper_tri)), float(np.max(upper_tri))
    best_threshold = (lo + hi) / 2

    for _ in range(40):
        mid = (lo + hi) / 2
        edge_count = int(np.sum(upper_tri >= mid))
        density = edge_count / max_edges if max_edges > 0 else 0
        if DENSITY_TARGET_MIN <= density <= DENSITY_TARGET_MAX:
            best_threshold = mid
            break
        elif density < DENSITY_TARGET_MIN:
            hi = mid
        else:
            lo = mid
        best_threshold = mid
        if hi - lo < 1e-6:
            break

    ids = df["_id"].tolist()
    depts = df["_dept"].tolist()

    g = ig.Graph()
    g.add_vertices(n)
    g.vs["respondent_id"] = ids
    g.vs["department"] = depts
    g.vs["label"] = [rid[:6] for rid in ids]

    edges = []
    weights = []
    for i in range(n):
        for j in range(i + 1, n):
            if sim_matrix[i, j] >= best_threshold:
                edges.append((i, j))
                weights.append(float(sim_matrix[i, j]))

    g.add_edges(edges)
    g.es["weight"] = weights

    return g


# ---------------------------------------------------------------------------
# 3. Community detection with stability analysis (Leiden + NMI)
# ---------------------------------------------------------------------------
def detect_communities_with_stability(
    g: ig.Graph, n_iterations: int = STABILITY_ITERATIONS
) -> tuple[ig.VertexClustering, float, str]:
    """Run Leiden n_iterations times. Return (best_partition, stability_nmi, label)."""
    partitions = []
    modularities = []

    for _ in range(n_iterations):
        part = g.community_leiden(
            objective_function="modularity",
            weights="weight",
            n_iterations=2,
        )
        partitions.append(part)
        modularities.append(part.modularity)

    best_idx = int(np.argmax(modularities))
    best_partition = partitions[best_idx]

    n_partitions = len(partitions)
    if n_partitions <= 20:
        nmis = []
        for i in range(n_partitions):
            for j in range(i + 1, n_partitions):
                nmi = ig.compare_communities(
                    partitions[i], partitions[j], method="nmi"
                )
                nmis.append(nmi)
    else:
        import random
        random.seed(42)
        nmis = []
        for _ in range(200):
            i, j = random.sample(range(n_partitions), 2)
            nmi = ig.compare_communities(
                partitions[i], partitions[j], method="nmi"
            )
            nmis.append(nmi)

    stability = float(np.mean(nmis)) if nmis else 0.0

    if stability >= NMI_ROBUST_THRESHOLD:
        label = "robust"
    elif stability >= NMI_MODERATE_THRESHOLD:
        label = "moderate"
    else:
        label = "weak"

    return best_partition, stability, label


# ---------------------------------------------------------------------------
# 4. Compute ONA metrics
# ---------------------------------------------------------------------------
def compute_ona_metrics(
    g: ig.Graph, partition: ig.VertexClustering,
    stability: float, stability_label: str,
    df: pd.DataFrame, dim_codes: list[str]
) -> dict:
    """Centrality, profiles, discriminants, bridges, stability."""

    n_communities = len(partition)
    modularity = partition.modularity
    avg_clustering = g.transitivity_avglocal_undirected(weights="weight")
    if avg_clustering != avg_clustering:  # NaN check
        avg_clustering = 0.0

    membership = partition.membership

    eigenvector_cent = g.eigenvector_centrality(weights="weight")
    betweenness_cent = g.betweenness(weights="weight")
    max_btw = max(betweenness_cent) if betweenness_cent else 1.0
    betweenness_norm = [b / max_btw if max_btw > 0 else 0 for b in betweenness_cent]
    degree_cent = [g.degree(v) / (g.vcount() - 1) for v in range(g.vcount())]

    edge_betweenness = g.edge_betweenness(weights="weight")
    max_eb = max(edge_betweenness) if edge_betweenness else 1.0
    edge_btw_norm = [eb / max_eb if max_eb > 0 else 0 for eb in edge_betweenness]

    ids = g.vs["respondent_id"]
    depts = g.vs["department"]
    node_metrics = []
    for v in range(g.vcount()):
        node_metrics.append({
            "id": ids[v][:8],
            "department": depts[v],
            "community": membership[v],
            "eigenvector": round(eigenvector_cent[v], 4),
            "betweenness": round(betweenness_norm[v], 4),
            "degree": round(degree_cent[v], 4),
            "connections": g.degree(v),
        })

    # Community profiles
    id_to_index = {row["_id"]: i for i, row in df.iterrows()}
    global_means = {c: float(df[c].mean()) for c in dim_codes}
    community_profiles = []

    for cidx in range(n_communities):
        comm_vertices = [v for v in range(g.vcount()) if membership[v] == cidx]
        comm_ids = [ids[v] for v in comm_vertices]
        comm_indices = [id_to_index[rid] for rid in comm_ids if rid in id_to_index]
        comm_df = df.iloc[comm_indices]

        dim_scores = {c: round(float(comm_df[c].mean()), 3) for c in dim_codes}
        avg_score = round(float(np.mean(list(dim_scores.values()))), 3)

        dept_counts = comm_df["_dept"].value_counts().to_dict()
        dept_dist = {
            k: {"count": int(v), "pct": round(v / len(comm_df) * 100, 1)}
            for k, v in dept_counts.items()
        }
        dominant_dept = max(dept_counts, key=dept_counts.get) if dept_counts else ""

        diffs = sorted(
            [(c, dim_scores[c] - global_means[c]) for c in dim_codes],
            key=lambda x: abs(x[1]), reverse=True,
        )
        top_diffs = [
            {"code": c, "diff": round(d, 3), "cluster_score": dim_scores[c]}
            for c, d in diffs[:3]
        ]

        community_profiles.append({
            "id": cidx,
            "size": len(comm_ids),
            "pct": round(len(comm_ids) / g.vcount() * 100, 1),
            "avg_score": avg_score,
            "dominant_department": dominant_dept,
            "department_distribution": dept_dist,
            "dimension_scores": dim_scores,
            "top_differences": top_diffs,
        })

    # Discriminant dimensions
    discriminants = []
    for code in dim_codes:
        cluster_means = [p["dimension_scores"][code] for p in community_profiles]
        if len(cluster_means) < 2:
            continue
        spread = max(cluster_means) - min(cluster_means)
        discriminants.append({
            "code": code,
            "spread": round(spread, 3),
            "max_cluster": int(np.argmax(cluster_means)),
            "max_value": round(max(cluster_means), 3),
            "min_cluster": int(np.argmin(cluster_means)),
            "min_value": round(min(cluster_means), 3),
        })
    discriminants.sort(key=lambda x: x["spread"], reverse=True)

    # Department density heatmap
    all_depts = sorted(set(depts))
    dept_density: dict[str, dict[str, float | None]] = {}
    dept_to_vertices: dict[str, list[int]] = defaultdict(list)
    for v in range(g.vcount()):
        dept_to_vertices[depts[v]].append(v)

    for da in all_depts:
        dept_density[da] = {}
        va = dept_to_vertices[da]
        for db in all_depts:
            vb = dept_to_vertices[db]
            if not va or not vb:
                dept_density[da][db] = None
                continue
            edge_count = 0
            if da == db:
                possible = len(va) * (len(va) - 1) / 2
                for i_idx, a in enumerate(va):
                    for b in va[i_idx + 1:]:
                        if g.are_connected(a, b):
                            edge_count += 1
            else:
                possible = len(va) * len(vb)
                for a in va:
                    for b in vb:
                        if g.are_connected(a, b):
                            edge_count += 1
            dept_density[da][db] = round(edge_count / possible, 3) if possible > 0 else None

    # Bridge nodes
    btw_threshold = float(np.percentile(betweenness_norm, 75)) if betweenness_norm else 0
    bridges = []
    for v in range(g.vcount()):
        if betweenness_norm[v] < btw_threshold:
            continue
        neighbor_comms = set()
        for neighbor in g.neighbors(v):
            neighbor_comms.add(membership[neighbor])
        if len(neighbor_comms) >= 2:
            bridges.append({
                "id": ids[v][:8],
                "department": depts[v],
                "community": membership[v],
                "betweenness": round(betweenness_norm[v], 4),
                "communities_bridged": len(neighbor_comms),
                "connections": g.degree(v),
            })
    bridges.sort(key=lambda x: x["betweenness"], reverse=True)

    # Critical edges (top 10 by edge betweenness that cross communities)
    critical_edges = []
    for eidx in range(g.ecount()):
        edge = g.es[eidx]
        src, tgt = edge.source, edge.target
        if membership[src] != membership[tgt]:
            critical_edges.append({
                "source_dept": depts[src],
                "target_dept": depts[tgt],
                "source_community": membership[src],
                "target_community": membership[tgt],
                "edge_betweenness": round(edge_btw_norm[eidx], 4),
                "weight": round(edge["weight"], 4),
            })
    critical_edges.sort(key=lambda x: x["edge_betweenness"], reverse=True)

    # Narrative
    narrative = _generate_narrative(
        n_communities, modularity, community_profiles,
        discriminants, bridges, stability, stability_label,
    )

    return {
        "summary": {
            "nodes": g.vcount(),
            "edges": g.ecount(),
            "density": round(g.density(), 4),
            "communities": n_communities,
            "modularity": round(modularity, 4),
            "avg_clustering": round(avg_clustering, 4),
        },
        "communities": community_profiles,
        "discriminants": discriminants[:10],
        "department_density": dept_density,
        "bridges": bridges[:20],
        "global_means": {c: round(v, 3) for c, v in global_means.items()},
        "narrative": narrative,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stability": {
            "nmi": round(stability, 4),
            "label": stability_label,
            "iterations": STABILITY_ITERATIONS,
            "method": "leiden",
        },
        "critical_edges": critical_edges[:10],
    }


def _generate_narrative(
    n_communities: int, modularity: float,
    communities: list[dict], discriminants: list[dict],
    bridges: list[dict], stability: float, stability_label: str,
) -> str:
    """Template-based narrative (no LLM)."""
    parts: list[str] = []

    if stability_label == "weak":
        parts.append(
            f"Nota: La estructura comunitaria tiene baja estabilidad (NMI={stability:.2f}). "
            "Los clusters detectados pueden variar entre ejecuciones y deben interpretarse con cautela."
        )

    if n_communities == 1:
        parts.append(
            "La organizacion presenta una percepcion homogenea: todos los "
            "colaboradores viven una realidad organizacional similar."
        )
    elif n_communities <= 3:
        parts.append(
            f"Se identificaron {n_communities} grupos perceptuales diferenciados dentro "
            "de la organizacion, lo que sugiere que coexisten realidades "
            "organizacionales distintas."
        )
    else:
        parts.append(
            f"La organizacion esta fragmentada en {n_communities} comunidades "
            "perceptuales, indicando multiples realidades organizacionales "
            "paralelas."
        )

    if discriminants:
        top_dims = ", ".join(d["code"] for d in discriminants[:3])
        parts.append(
            f"Las dimensiones que mas diferencian a los grupos son: {top_dims}."
        )

    if len(communities) >= 2:
        by_score = sorted(communities, key=lambda c: c["avg_score"], reverse=True)
        best, worst = by_score[0], by_score[-1]
        parts.append(
            f"El grupo {best['id'] + 1} ({best['size']} personas, "
            f"mayoritariamente {best['dominant_department']}) tiene la "
            f"percepcion mas favorable ({best['avg_score']:.2f}), mientras "
            f"que el grupo {worst['id'] + 1} ({worst['size']} personas, "
            f"mayoritariamente {worst['dominant_department']}) presenta la "
            f"percepcion mas critica ({worst['avg_score']:.2f})."
        )

    if bridges:
        parts.append(
            f"Se identificaron {len(bridges)} nodos puente — personas que "
            "conectan multiples comunidades y pueden actuar como traductores "
            "culturales."
        )
    else:
        parts.append(
            "No se identificaron nodos puente significativos entre las "
            "comunidades."
        )

    return " ".join(parts)


# ---------------------------------------------------------------------------
# 5. Generate static graph image
# ---------------------------------------------------------------------------
def generate_graph_image(
    g: ig.Graph, membership: list[int]
) -> str:
    """Generate PNG graph visualization, return base64 string."""

    n_communities = max(membership) + 1 if membership else 1

    colors = []
    for m in membership:
        colors.append(CLUSTER_COLORS[m % len(CLUSTER_COLORS)])
    g.vs["color"] = colors

    btw = g.betweenness(weights="weight")
    max_btw = max(btw) if btw and max(btw) > 0 else 1.0
    g.vs["size"] = [15 + 25 * (b / max_btw) for b in btw]

    edge_colors = []
    edge_widths = []
    for edge in g.es:
        src_comm = membership[edge.source]
        tgt_comm = membership[edge.target]
        if src_comm == tgt_comm:
            base_color = CLUSTER_COLORS[src_comm % len(CLUSTER_COLORS)]
            edge_colors.append(base_color + "40")
            edge_widths.append(0.3)
        else:
            edge_colors.append("#94a3b888")
            edge_widths.append(0.5)
    g.es["color"] = edge_colors
    g.es["width"] = edge_widths

    layout = g.layout("fruchterman_reingold", weights="weight", niter=500)

    fig, ax = plt.subplots(figsize=(10, 10))
    fig.patch.set_facecolor("white")

    ig.plot(
        g,
        target=ax,
        layout=layout,
        vertex_label=None,
        vertex_frame_color="white",
        vertex_frame_width=1.0,
        edge_curved=0.1,
    )

    legend_handles = []
    for i in range(n_communities):
        count = membership.count(i)
        handle = ax.scatter(
            [], [], s=80,
            facecolor=CLUSTER_COLORS[i % len(CLUSTER_COLORS)],
            edgecolor="white", linewidth=0.5,
            label=f"Grupo {i+1} ({count})"
        )
        legend_handles.append(handle)
    ax.legend(
        handles=legend_handles,
        title="Comunidades",
        loc="upper left",
        fontsize=9,
        title_fontsize=10,
        framealpha=0.9,
    )

    ax.set_title("Red de similitud perceptual", fontsize=14, fontweight="bold", pad=15)
    ax.axis("off")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")

    return b64


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def run_ona(campaign_id: str) -> dict:
    """Run full ONA pipeline for a campaign. Returns results dict."""
    _init_deterministic_rng()

    sb = get_supabase()
    result = fetch_campaign_data(sb, campaign_id)
    if result is None:
        raise ValueError(
            f"Datos insuficientes para ONA (min {MIN_RESPONDENTS} respondientes completos)"
        )

    df, dim_codes = result

    g = build_similarity_graph(df, dim_codes)
    if g.ecount() == 0:
        raise ValueError("No se generaron aristas en el grafo de similitud")

    partition, stability, stability_label = detect_communities_with_stability(g)

    metrics = compute_ona_metrics(
        g, partition, stability, stability_label, df, dim_codes
    )

    graph_image_b64 = generate_graph_image(g, partition.membership)
    metrics["graph_image"] = graph_image_b64

    save_results(sb, campaign_id, "ona_network", metrics)

    return metrics

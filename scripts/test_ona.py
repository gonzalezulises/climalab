"""Tests for ONA perceptual network analysis (scripts/ona-analysis.py).

These tests exercise pure computation functions and do NOT require Supabase.
Run with: pytest scripts/test_ona.py -v
"""
import importlib
import importlib.util
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import igraph as ig
import pytest

# Import ona-analysis.py (hyphenated filename requires importlib)
_script_path = Path(__file__).parent / "ona-analysis.py"
_spec = importlib.util.spec_from_file_location("ona_analysis", _script_path)
ona = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ona)

# 22 dimension codes (excluding ENG which is the dependent variable)
DIM_CODES = [f"D{i:02d}" for i in range(1, 23)]


def _make_df_uniform(n: int, score: float, dept: str = "Dept0", start_id: int = 0) -> list[dict]:
    """Create n respondent rows where every dimension = score."""
    rows = []
    for i in range(n):
        row = {code: score for code in DIM_CODES}
        row["_id"] = f"resp-{start_id + i:04d}"
        row["_dept"] = dept
        row["_tenure"] = ""
        row["_gender"] = ""
        rows.append(row)
    return rows


def _make_df_profile(n: int, profile: list[float], dept: str = "Dept0", start_id: int = 0) -> list[dict]:
    """Create n respondent rows with a specific dimension profile (length must match DIM_CODES)."""
    rows = []
    for i in range(n):
        row = {code: profile[j] for j, code in enumerate(DIM_CODES)}
        row["_id"] = f"resp-{start_id + i:04d}"
        row["_dept"] = dept
        row["_tenure"] = ""
        row["_gender"] = ""
        rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# Test 1: Identical profiles should land in a single community
# ---------------------------------------------------------------------------
def test_identical_profiles_same_community():
    """15 respondents with identical vectors should form 1 community."""
    rows = _make_df_uniform(15, 4.0)
    df = pd.DataFrame(rows)
    g = ona.build_similarity_graph(df, DIM_CODES)

    # All cosine similarities should be 1.0 (identical vectors), so all connected
    assert g.vcount() == 15
    assert g.ecount() > 0

    partition, stability, label = ona.detect_communities_with_stability(g, n_iterations=10)
    # Identical profiles => single community
    assert len(partition) == 1, (
        f"Expected 1 community for identical profiles, got {len(partition)}"
    )


# ---------------------------------------------------------------------------
# Test 2: Two distinct clusters should be detected
# ---------------------------------------------------------------------------
def test_two_distinct_clusters():
    """Two groups with opposing dimension profiles should form 2+ communities.

    Cosine similarity measures direction, not magnitude — so we need profiles
    that point in different directions (e.g., high-first-half/low-second-half
    vs low-first-half/high-second-half).
    """
    # Profile A: high on first 11 dims, low on last 11
    profile_a = [4.5] * 11 + [1.5] * 11
    # Profile B: low on first 11 dims, high on last 11 (opposing direction)
    profile_b = [1.5] * 11 + [4.5] * 11

    rows_a = _make_df_profile(10, profile_a, dept="DeptA", start_id=0)
    rows_b = _make_df_profile(10, profile_b, dept="DeptB", start_id=10)
    df = pd.DataFrame(rows_a + rows_b)
    g = ona.build_similarity_graph(df, DIM_CODES)

    assert g.vcount() == 20
    assert g.ecount() > 0

    partition, stability, label = ona.detect_communities_with_stability(g, n_iterations=10)

    # Should detect at least 2 communities
    assert len(partition) >= 2, (
        f"Expected >= 2 communities for opposing profiles, got {len(partition)}"
    )

    membership = partition.membership
    # Group A = indices 0-9, Group B = indices 10-19
    # Majority of each group should share a community distinct from the other
    from collections import Counter
    comm_a = Counter(membership[i] for i in range(10)).most_common(1)[0][0]
    comm_b = Counter(membership[i] for i in range(10, 20)).most_common(1)[0][0]
    assert comm_a != comm_b, (
        "Expected group A and group B to be in different communities"
    )


# ---------------------------------------------------------------------------
# Test 3: NMI of identical partitions should be 1.0
# ---------------------------------------------------------------------------
def test_nmi_stability_identical_partitions():
    """Comparing a partition with itself via NMI should yield 1.0."""
    g = ig.Graph.Full(10)
    # Create a simple partition: first 5 in community 0, last 5 in community 1
    membership = [0] * 5 + [1] * 5
    clustering = ig.VertexClustering(g, membership)

    nmi = ig.compare_communities(clustering, clustering, method="nmi")
    assert nmi == pytest.approx(1.0), f"NMI of identical partitions should be 1.0, got {nmi}"


# ---------------------------------------------------------------------------
# Test 4: Density target constants are documented and valid
# ---------------------------------------------------------------------------
def test_density_targets_documented():
    """DENSITY_TARGET_MIN and DENSITY_TARGET_MAX should exist and be valid."""
    assert hasattr(ona, "DENSITY_TARGET_MIN")
    assert hasattr(ona, "DENSITY_TARGET_MAX")
    assert 0 < ona.DENSITY_TARGET_MIN < 1
    assert 0 < ona.DENSITY_TARGET_MAX < 1
    assert ona.DENSITY_TARGET_MIN < ona.DENSITY_TARGET_MAX


# ---------------------------------------------------------------------------
# Test 5: MIN_RESPONDENTS is documented
# ---------------------------------------------------------------------------
def test_min_respondents_documented():
    """MIN_RESPONDENTS should be 10."""
    assert ona.MIN_RESPONDENTS == 10


# ---------------------------------------------------------------------------
# Test 6: NMI thresholds are documented
# ---------------------------------------------------------------------------
def test_nmi_thresholds_documented():
    """NMI_ROBUST_THRESHOLD and NMI_MODERATE_THRESHOLD should exist with correct values."""
    assert ona.NMI_ROBUST_THRESHOLD == 0.80
    assert ona.NMI_MODERATE_THRESHOLD == 0.50


# ---------------------------------------------------------------------------
# Test 7: RANDOM_SEED constant exists
# ---------------------------------------------------------------------------
def test_random_seed_documented():
    """RANDOM_SEED should be 42."""
    assert hasattr(ona, "RANDOM_SEED")
    assert ona.RANDOM_SEED == 42


# ---------------------------------------------------------------------------
# Determinism helpers
# ---------------------------------------------------------------------------
def _generate_test_data(seed: int = 999, n: int = 30) -> pd.DataFrame:
    """Generate synthetic respondent data with two distinct clusters."""
    rng = np.random.RandomState(seed)
    rows = []
    for i in range(n):
        # First half: high-low profile; second half: low-high profile
        if i < n // 2:
            base = [4.0] * 11 + [2.0] * 11
        else:
            base = [2.0] * 11 + [4.0] * 11
        # Add small noise to avoid perfectly identical vectors
        noise = rng.normal(0, 0.2, 22)
        profile = np.clip(np.array(base) + noise, 1.0, 5.0)
        row = {code: float(profile[j]) for j, code in enumerate(DIM_CODES)}
        row["_id"] = f"det-{i:04d}"
        row["_dept"] = f"Dept{'A' if i < n // 2 else 'B'}"
        row["_tenure"] = ""
        row["_gender"] = ""
        rows.append(row)
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Test 8: ONA is deterministic — two runs produce identical results
# ---------------------------------------------------------------------------
def test_ona_is_deterministic():
    """Two runs with the same data produce the same result."""
    df = _generate_test_data(seed=999, n=30)

    result_1 = ona.run_ona_pipeline(df, DIM_CODES)
    result_2 = ona.run_ona_pipeline(df, DIM_CODES)

    assert result_1["n_communities"] == result_2["n_communities"], \
        f"Communities: {result_1['n_communities']} vs {result_2['n_communities']}"

    assert result_1["community_assignments"] == result_2["community_assignments"], \
        "Community assignments differ between runs"

    assert abs(result_1["nmi_stability"] - result_2["nmi_stability"]) < 0.001, \
        f"NMI: {result_1['nmi_stability']} vs {result_2['nmi_stability']}"

    assert abs(result_1["threshold"] - result_2["threshold"]) < 0.0001, \
        f"Threshold: {result_1['threshold']} vs {result_2['threshold']}"


# ---------------------------------------------------------------------------
# Test 9: Determinism survives module reload (no global state leakage)
# ---------------------------------------------------------------------------
def test_ona_deterministic_across_restarts():
    """Result is the same after re-importing the module (no accumulated global state)."""
    df = _generate_test_data(seed=123, n=30)

    result_cold = ona.run_ona_pipeline(df, DIM_CODES)

    # Re-import the module fresh to simulate a new process
    spec = importlib.util.spec_from_file_location("ona_analysis_fresh", _script_path)
    ona_fresh = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ona_fresh)

    result_warm = ona_fresh.run_ona_pipeline(df, DIM_CODES)

    assert result_cold["n_communities"] == result_warm["n_communities"]
    assert result_cold["community_assignments"] == result_warm["community_assignments"]

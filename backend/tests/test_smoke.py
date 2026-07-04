"""
Smoke tests — verify the app's core wiring without needing a DB or network.

These assert that the v2 manifest (intelligence.yaml) loads and declares the
seed's example agent + workflow, and that the platform-facing graph builds from
it. They give the `Test Backend` CI job real coverage and clear the "no tests
directory" warning.
"""


def _load_manifest():
    from claritty_sdk.runtime.bootstrap import load as _bootstrap_load
    from backend.manifest_path import resolve_manifest_name

    return _bootstrap_load(resolve_manifest_name()).manifest


def test_manifest_declares_components():
    m = _load_manifest()

    assert len(m.agents or []) >= 1
    assert len(m.workflows or []) >= 1
    # The seed ships one example trigger; triggers are platform-managed.
    assert len(m.triggers or []) >= 1


def test_graph_builds():
    from claritty_sdk.graph import build_graph_from_manifest

    graph = build_graph_from_manifest(_load_manifest())

    assert isinstance(graph, dict)
    assert "nodes" in graph and "edges" in graph
    assert len(graph["nodes"]) >= 1


def test_no_startup_data_seeding():
    """First run must be a connect-first EMPTY state — the app never seeds
    sample/mock rows on boot (mirrors the identity gate's blocking check)."""
    import inspect
    import re

    import backend.database as database

    seeders = [n for n in dir(database) if n.startswith("seed_")]
    assert seeders == [], f"backend.database defines startup seeders: {seeders}"

    import backend.main as main

    src = re.sub(r"#.*", "", inspect.getsource(main))
    assert not re.search(r"\bseed_[a-z0-9_]*\s*\(", src), (
        "backend/main.py calls a seeder on startup — first run must show real "
        "data or an honest empty state"
    )

"""tests/test_fiber_network_honesty.py

Guards against the exact defect the data catalog audit found: three
hand-typed fiber routes in data/sample_layers.json, each attributing an
invented coordinate path to a real named carrier ("Zayo Northern Virginia
Dark Fiber Ring", "Lumen/CenturyLink Iowa Backbone", "Zayo Pacific NW Fiber
Route") with no source URL and no evidence any of them actually reflects
that carrier's real infrastructure.

The fix removed those three entries. This test is what stops them (or
anything shaped like them) from quietly coming back: every fiber_network
entry, present or future, must carry a real source URL before it can name a
specific carrier.

Run:  python3 -m pytest tests/test_fiber_network_honesty.py -q
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_LAYERS_PATH = ROOT / "data" / "sample_layers.json"


def _load():
    return json.loads(SAMPLE_LAYERS_PATH.read_text())


def test_fiber_network_is_currently_empty():
    # As of this fix, no free reliable nationwide fiber route dataset is
    # known to exist, so the honest state is zero entries -- not three
    # invented ones. If this test ever needs to change because real,
    # verifiably-sourced fiber data was added, the entries it protects must
    # pass test_every_fiber_entry_has_a_real_source below.
    d = _load()
    assert d["fiber_network"] == []


def test_the_removal_is_explained_in_the_file_itself():
    d = _load()
    note = d.get("_fiber_network_note", "")
    assert "fabrication" in note.lower() or "invented" in note.lower()
    assert "verified" in note.lower()


def test_every_fiber_entry_has_a_real_source():
    # The structural guard: whatever gets added here in the future, an entry
    # naming a specific carrier without a source URL is exactly how the
    # original three routes got in. Applies even if the list above is
    # extended later.
    d = _load()
    for entry in d.get("fiber_network", []):
        sources = entry.get("sources") or []
        urls = [s.get("url") for s in sources if isinstance(s, dict) and s.get("url")]
        assert urls, (
            f"fiber_network entry {entry.get('id', '?')} ({entry.get('name', '?')}) has no "
            f"sourced URL -- do not attribute a route to a named carrier without one"
        )


def test_validate_sources_checks_fiber_network():
    # validate_sources.py is the script that actually pings source URLs and
    # flags dead links; fiber_network must be in its checked category list or
    # a future sourced entry's URL would silently never get validated.
    import sys
    sys.path.insert(0, str(ROOT / "data"))
    import importlib
    vs = importlib.import_module("validate_sources")
    src = (ROOT / "data" / "validate_sources.py").read_text()
    assert '"fiber_network"' in src

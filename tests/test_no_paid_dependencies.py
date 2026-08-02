#!/usr/bin/env python3
"""Guard: nothing in this project may require payment to function.

WHY THIS EXISTS
The project's standing rule is that a visitor needs no account, and a
maintainer needs no paid service, for the site to work. That is easy to state
and easy to erode — one convenient paid API, one CDN that later gates behind a
plan, and the claim quietly stops being true. Prose in DATA_SOURCES.md cannot
enforce it; this can.

WHAT IT CHECKS
  1. No known paid/commercial data service appears in code or config.
  2. No dependency manifest pulls a paid or license-restricted package.
  3. Every API key the project reads is OPTIONAL — its absence must be handled,
     never fatal.
  4. Workflows do not reference secrets for services that were removed.
  5. Tile providers stay on the reviewed allowlist, so a paid one cannot be
     swapped in unnoticed.

WHAT IT DELIBERATELY DOES NOT CHECK
Whether a currently-free service *stays* free. No test can know that. The
mitigation for that risk is graceful degradation, covered by
test_tile_independence below and by the browser suite.

Run:
    python3 tests/test_no_paid_dependencies.py
    python3 -m pytest tests/test_no_paid_dependencies.py -q
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

_results = {"pass": 0, "fail": 0}


def check(cond, msg):
    if cond:
        _results["pass"] += 1
    else:
        _results["fail"] += 1
        print(f"  FAIL: {msg}")


def eq(actual, expected, msg):
    check(actual == expected, f"{msg} — expected {expected!r}, got {actual!r}")


# Files that legitimately discuss paid services in prose. Documentation must be
# able to explain WHY something was rejected without tripping the guard, and
# version-history snapshots are immutable archives that must never be rewritten.
DOC_EXEMPT = {
    "AI_CHANGELOG.md", "AI_CONTEXT.md", "DATA_SOURCES.md", "README.md",
    "BUG_TRACKER.md", "PROJECT_CONTEXT.md",
}
# data/facilities_version_history/ holds dated, write-once snapshots of past
# facility_pipeline runs — pure archive, never re-read as config and never
# executed. Eight snapshots from 2026-07-12/13 legitimately mention
# "cloudscene" because that's what the pipeline used at the time, before its
# removal on 2026-07-27; scanning them serves no protective purpose and just
# trains reviewers to expect (and tune out) a permanent false positive. This
# exemption does NOT weaken the guard against a real reintroduction: any
# paid service coming back for real would first appear in a live source —
# an adapter file, facility_sources.json, requirements.txt, a workflow — all
# of which stay fully scanned. A new snapshot inheriting that string from a
# live reintroduction would only ever get generated after the guard had
# already failed on the source it came from. Ratified 2026-07-30 (Bobby).
PATH_EXEMPT = ("data/facilities_version_history/", "tests/test_no_paid_dependencies.py",
               ".git/", "node_modules/", "vendor/")


def _scannable():
    """Source and config files, excluding docs, archives and vendored libs."""
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        rel = str(p.relative_to(ROOT))
        if any(rel.startswith(x) for x in PATH_EXEMPT):
            continue
        if p.name in DOC_EXEMPT:
            continue
        if p.suffix not in (".py", ".js", ".json", ".yml", ".yaml", ".html", ".css", ".sh"):
            continue
        yield p, rel


# ── 1. No paid data services in code or config ──────────────────────────────

# Services that charge for API access. Each was either never adopted or was
# deliberately removed; none may return without a conscious decision to pay.
PAID_SERVICES = {
    "cloudscene":      "Cloudscene — paid colocation database (integration removed 2026-07-27)",
    "api.cloudscene":  "Cloudscene API endpoint",
    "datacenterhawk":  "datacenterHawk — paid CRE data",
    "mapbox":          "Mapbox — usage-priced tiles, requires an access token",
    "maptiler":        "MapTiler — usage-priced tiles, requires a key",
    "googleapis.com/maps": "Google Maps Platform — billed per request",
    "maps.googleapis": "Google Maps Platform — billed per request",
    "alphavantage":    "Alpha Vantage — paid tiers for useful rate limits",
    "polygon.io":      "Polygon.io — paid market data",
    "iexcloud":        "IEX Cloud — paid market data",
    "finnhub":         "Finnhub — paid tiers",
    "quandl":          "Nasdaq Data Link / Quandl — paid datasets",
    "rapidapi":        "RapidAPI — marketplace, most listings paid",
    "openai.com/v1":   "OpenAI API — billed per token",
    "api.anthropic":   "Anthropic API — billed per token",
}


def test_no_paid_service_references():
    hits = []
    for p, rel in _scannable():
        try:
            text = p.read_text(encoding="utf-8", errors="replace").lower()
        except Exception:                                    # noqa: BLE001
            continue
        for needle, why in PAID_SERVICES.items():
            if needle in text:
                hits.append(f"{rel}: '{needle}' — {why}")
    check(not hits, "paid service referenced in code/config:\n      " +
                    "\n      ".join(hits[:8]))


def test_cloudscene_fully_removed():
    """The one paid integration this project ever had. Its adapter, source
    entry, model field and workflow secret were all removed together — a
    half-removal would leave the pipeline importing a deleted module."""
    check(not (ROOT / "data/facility_pipeline/adapters/cloudscene.py").exists(),
          "cloudscene adapter file still present")

    sources = json.loads((ROOT / "data/facility_sources.json").read_text(encoding="utf-8"))
    srcs = sources.get("sources", sources) if isinstance(sources, dict) else sources
    ids = [s.get("id") for s in srcs]
    check("cloudscene" not in ids, "cloudscene still in facility_sources.json")

    runner = (ROOT / "data/run_facility_pipeline.py").read_text(encoding="utf-8")
    check("cloudscene" not in runner.lower(),
          "run_facility_pipeline.py still references cloudscene (would ImportError)")


def test_facility_sources_all_free():
    """Every remaining facility source must be free and unauthenticated."""
    sources = json.loads((ROOT / "data/facility_sources.json").read_text(encoding="utf-8"))
    srcs = sources.get("sources", sources) if isinstance(sources, dict) else sources
    paid = [s.get("id") for s in srcs
            if s.get("requires_auth") and s.get("active")]
    check(not paid, f"active facility sources requiring auth: {paid}")


# ── 2. Dependency manifests ─────────────────────────────────────────────────

def test_no_npm_dependency_tree():
    """No package.json means no npm tree to license-audit and no build step."""
    check(not (ROOT / "package.json").exists(),
          "package.json appeared — a dependency tree now needs license auditing")
    check(not (ROOT / "package-lock.json").exists(), "package-lock.json appeared")


def test_python_requirements_are_free():
    """All Python deps must be permissively licensed and free."""
    req = ROOT / "data/requirements.txt"
    if not req.exists():
        check(True, "no requirements.txt")
        return
    # Known-free, permissively licensed packages this project may use.
    ALLOWED = {"requests", "beautifulsoup4", "python-dateutil", "pytest",
               "lxml", "urllib3", "certifi", "charset-normalizer", "idna",
               "soupsieve", "six", "jsdom",
               # openpyxl: BSD-licensed, no paid tier, no network calls — used
               # by facility_pipeline/adapters/ferc_queue.py to read FERC's
               # published XLSX interconnection queue file.
               "openpyxl"}
    unknown = []
    for line in req.read_text(encoding="utf-8").splitlines():
        line = line.split("#")[0].strip()
        if not line:
            continue
        name = re.split(r"[<>=!\[;]", line)[0].strip().lower()
        if name and name not in ALLOWED:
            unknown.append(name)
    check(not unknown,
          f"unreviewed Python dependency (confirm it is free, then add to ALLOWED): {unknown}")


def test_economic_pipeline_is_stdlib_only():
    """The newest pipeline must not have quietly added a dependency."""
    src = (ROOT / "data/update_economic_data.py").read_text(encoding="utf-8")
    imports = set(re.findall(r"^\s*(?:import|from)\s+([a-zA-Z_][\w.]*)", src, re.M))
    tops = {i.split(".")[0] for i in imports}
    STDLIB = {"argparse", "json", "os", "sys", "time", "urllib", "datetime",
              "pathlib", "re", "collections", "concurrent", "threading", "random",
              "csv", "io"}
    extra = tops - STDLIB
    check(not extra, f"economic pipeline gained a non-stdlib import: {extra}")


def test_bls_qcew_requires_no_key():
    """BLS QCEW's open-data CSV endpoint needs no registration or key at
    all -- verify the pipeline never invents one. A BLS_API_KEY appearing
    here would mean a future edit started gating a genuinely free, keyless
    endpoint behind credentials that don't exist for it."""
    src = (ROOT / "data/update_economic_data.py").read_text(encoding="utf-8")
    check("BLS_API_KEY" not in src,
          "BLS_API_KEY referenced -- QCEW's area-slice API needs no key")
    check("collect_bls_wages" in src, "BLS QCEW module missing entirely")


def test_fema_nri_requires_no_key():
    """FEMA's National Risk Index static file needs no registration or key
    at all, same as BLS QCEW -- verify the pipeline never invents one."""
    src = (ROOT / "data/update_economic_data.py").read_text(encoding="utf-8")
    check("NRI_API_KEY" not in src and "FEMA_API_KEY" not in src,
          "an API key referenced for FEMA NRI -- its static file needs none")
    check("collect_fema_nri" in src, "FEMA NRI module missing entirely")


# ── 3. Every API key must be optional ───────────────────────────────────────

def test_api_keys_are_all_optional():
    """A key may improve results but must never be required.

    The pattern that satisfies this is os.environ.get(KEY, default) plus an
    explicit skip path. os.environ[KEY] would raise and make the key mandatory.
    """
    KEYS = ["FRED_API_KEY", "CENSUS_API_KEY", "LEGISCAN_API_KEY", "CONGRESS_API_KEY", "EIA_API_KEY"]
    for key in KEYS:
        for p, rel in _scannable():
            if p.suffix != ".py":
                continue
            text = p.read_text(encoding="utf-8", errors="replace")
            if key not in text:
                continue
            # Hard-required access would look like os.environ["KEY"]
            check(f'os.environ["{key}"]' not in text and f"os.environ['{key}']" not in text,
                  f"{rel}: {key} accessed with os.environ[...] — makes the key MANDATORY; "
                  f"use os.environ.get() plus a skip path")


def test_missing_key_is_a_skip_not_a_failure():
    """The economic pipeline must exit 0 with no keys set, preserving data."""
    src = (ROOT / "data/update_economic_data.py").read_text(encoding="utf-8")
    check("FRED_API_KEY is not set" in src,
          "no explicit warning path for a missing FRED key")
    check("CENSUS_API_KEY is not set" in src,
          "no explicit branch for a missing Census key")
    check("preserved unchanged" in src,
          "missing-key path does not state that existing data is preserved")


def test_census_key_is_required_and_degrades_gracefully():
    """Census requires a key (Census policy since May 12, 2026) but a missing
    one must still be a skip, not a crash — same contract as FRED.

    This test used to assert Census ran successfully WITHOUT a key, because
    that was true when it was written: Census then allowed ~500 unauthenticated
    requests/day. Census closed that off for every Data API request, which is
    what turned the pipeline's real keyless attempts into unexplained
    JSONDecodeErrors in production before this was understood. The assertion
    changed to match; the underlying "never crash, never require a key to
    avoid a hard failure" rule has not.
    """
    src = (ROOT / "data/update_economic_data.py").read_text(encoding="utf-8")
    check("_census_key_param" in src,
          "no helper that omits the Census key parameter when it is unset "
          "(still correct even though a key is now required in practice: "
          "Census rejects a blank key= outright, never treats it as 'no key')")
    check("CENSUS_API_KEY is not set — skipping Census" in src,
          "missing Census key no longer has an explicit skip path with a clear reason")
    check("May 12, 2026" in src,
          "the policy-change date should be documented, not just 'requires a key'")


def test_eia_key_missing_is_a_skip_not_a_failure():
    """EIA is optional, unlike FRED/Census -- a missing EIA_API_KEY must still
    leave every other source untouched, not just avoid crashing the whole run."""
    src = (ROOT / "data/update_economic_data.py").read_text(encoding="utf-8")
    check("EIA_API_KEY" in src, "no reference to the optional EIA key at all")
    check('os.environ.get("EIA_API_KEY"' in src,
          "EIA key must be read with .get(), not os.environ[...] (which would be mandatory)")
    check("and eia_key:" in src,
          "the EIA module's execution guard must condition on the key being present, "
          "so a missing key is a skip rather than an attempted request with an empty key")


def test_no_key_required_for_the_site_itself():
    """A visitor must never need any credential. The frontend may NAME a secret
    in maintainer-facing copy, but must not read one."""
    for p, rel in _scannable():
        if p.suffix != ".js":
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        for key in ("FRED_API_KEY", "CENSUS_API_KEY", "LEGISCAN_API_KEY", "EIA_API_KEY"):
            if key in text:
                # Allowed only inside a quoted <code> hint to a maintainer.
                ok = f"<code>{key}</code>" in text
                check(ok, f"{rel}: reads {key} client-side — keys must be server-side only")


# ── 4. Workflow secrets must match services that still exist ────────────────

def test_no_orphaned_workflow_secrets():
    wf_dir = ROOT / ".github/workflows"
    if not wf_dir.exists():
        return
    for wf in wf_dir.glob("*.yml"):
        text = wf.read_text(encoding="utf-8")
        for secret in re.findall(r"secrets\.([A-Z0-9_]+)", text):
            check(secret != "CLOUDSCENE_API_KEY",
                  f"{wf.name}: references removed paid service secret {secret}")


# ── 5. Tile providers stay on the reviewed allowlist ────────────────────────

def test_tile_providers_on_allowlist():
    """Basemap hosts are reviewed for cost. A paid provider must not appear
    without that review — Mapbox and MapTiler in particular are trivially easy
    to drop in and are usage-priced."""
    ALLOWED_TILE_HOSTS = {
        "basemaps.cartocdn.com",        # CARTO — free, attribution required
        "server.arcgisonline.com",      # Esri — free for light use, attribution
        "basemap.nationalmap.gov",      # USGS — US federal, public domain
        "tile.openstreetmap.org",       # OSM — free under the tile usage policy
        "s3.amazonaws.com",             # AWS Open Data "Terrain Tiles" — free,
                                         # keyless elevation tiles for the 3D
                                         # view; registry.opendata.aws/terrain-tiles/
    }
    found = set()
    for p, rel in _scannable():
        if p.suffix != ".js":
            continue
        for host in re.findall(r"https://(?:\{s\}\.)?([a-z0-9.-]+)/[^\"']*\{z\}", p.read_text(encoding="utf-8", errors="replace")):
            found.add(host)
    unexpected = found - ALLOWED_TILE_HOSTS
    check(not unexpected,
          f"unreviewed tile host (confirm free, then add to allowlist): {unexpected}")


def test_tile_independence_documented():
    """Tiles are decoration, not function. If a provider ever demanded payment
    the map must still work — that is what keeps a free-tier service from
    becoming a payment requirement."""
    ctx = (ROOT / "AI_CONTEXT.md").read_text(encoding="utf-8")
    check("air-gapped" in ctx or "no background tiles" in ctx,
          "AI_CONTEXT.md no longer documents that the map renders without tiles")


# ── 6. The audit itself must stay in the docs ───────────────────────────────

def test_cost_audit_documented():
    ds = (ROOT / "DATA_SOURCES.md").read_text(encoding="utf-8")
    check("Cost & Licensing Audit" in ds, "DATA_SOURCES.md lost the Cost & Licensing Audit")
    rd = (ROOT / "README.md").read_text(encoding="utf-8")
    check("## Cost" in rd, "README.md lost its Cost section")


def test_fixed_rule_is_stated_in_governance_docs():
    """The rule and its enforcement must not drift apart.

    A test with no stated rule behind it looks like an arbitrary lint and gets
    exempted by whoever it inconveniences. A stated rule with no test rots.
    Both must exist, in the two files every assistant is required to read.
    """
    pc = (ROOT / "PROJECT_CONTEXT.md").read_text(encoding="utf-8")
    check("Nothing May Require Payment" in pc,
          "PROJECT_CONTEXT.md lost the fixed no-payment rule")
    check("complete and fixed rule" in pc.lower(),
          "PROJECT_CONTEXT.md no longer states the rule is fixed and non-negotiable")
    check("test_no_paid_dependencies" in pc,
          "PROJECT_CONTEXT.md no longer points at the enforcing test")

    ac = (ROOT / "AI_CONTEXT.md").read_text(encoding="utf-8")
    check("NOTHING MAY REQUIRE PAYMENT" in ac,
          "AI_CONTEXT.md lost the fixed no-payment rule from its mandatory workflow")


def test_this_guard_is_wired_into_the_suite():
    """An enforcing test that nobody runs enforces nothing."""
    sh = (ROOT / "tests/run_all.sh").read_text(encoding="utf-8")
    check("test_no_paid_dependencies.py" in sh,
          "this guard was removed from tests/run_all.sh — it no longer runs")


# ── runner ──────────────────────────────────────────────────────────────────

def main():
    print("No-paid-dependency guard\n")
    tests = [(n, f) for n, f in sorted(globals().items())
             if n.startswith("test_") and callable(f)]
    for name, fn in tests:
        try:
            fn()
        except Exception as e:                               # noqa: BLE001
            _results["fail"] += 1
            print(f"  ERROR in {name}: {type(e).__name__}: {e}")
    total = _results["pass"] + _results["fail"]
    print(f"\n{_results['pass']}/{total} checks passed across {len(tests)} tests")
    if _results["fail"]:
        print(f"{_results['fail']} FAILED — something in this project may now require payment")
        return 1
    print("Nothing in this project requires payment.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

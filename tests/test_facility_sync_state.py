"""tests/test_facility_sync_state.py — data/facility_pipeline/sync.py's
SyncState.update() must clear a stale last_error on the next successful sync.

Real bug found while investigating Phase 4 (data-center census expansion):
facilities_sync_state.json's ferc_queue entry still showed a pre-2026-07-26
"openpyxl required" error on 2026-08-09 runs, long after that dependency was
fixed, because update() bumped last_synced on every successful run but never
removed the leftover last_error/last_error_at fields from an older failed
run -- misrepresenting a source that has been succeeding (with zero rows,
since FERC's site happens to be unreachable from this sandbox, an error the
adapter itself catches and never raises) as currently broken.

Run:  python3 -m pytest tests/test_facility_sync_state.py -q
"""
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data"))

from facility_pipeline.sync import SyncState  # noqa: E402


def _fresh_state():
    tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
    tmp.write(b"{}")
    tmp.close()
    return SyncState(path=tmp.name)


def test_update_clears_stale_last_error():
    sync = _fresh_state()
    sync.mark_failed("ferc_queue", "openpyxl required: pip install openpyxl")
    assert sync.get("ferc_queue")["last_error"] == "openpyxl required: pip install openpyxl"

    sync.update("ferc_queue")
    entry = sync.get("ferc_queue")
    assert "last_error" not in entry
    assert "last_error_at" not in entry


def test_update_still_advances_last_synced():
    sync = _fresh_state()
    sync.mark_failed("ferc_queue", "some transient error")
    sync.update("ferc_queue")
    assert sync.last_synced("ferc_queue") is not None


def test_update_still_merges_extra_kwargs():
    sync = _fresh_state()
    sync.update("datacentermap", etag="abc123")
    assert sync.etag("datacentermap") == "abc123"


def test_mark_failed_after_success_is_still_visible():
    # A genuinely new failure after a prior success must still be reported --
    # this fix must not accidentally suppress real, current errors.
    sync = _fresh_state()
    sync.update("osm")
    sync.mark_failed("osm", "504 Server Error: Gateway Timeout")
    assert sync.get("osm")["last_error"] == "504 Server Error: Gateway Timeout"


def test_no_prior_state_update_does_not_crash():
    sync = _fresh_state()
    sync.update("brand_new_source")
    entry = sync.get("brand_new_source")
    assert "last_error" not in entry
    assert entry["last_synced"] is not None

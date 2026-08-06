"""Scanner behaviour that the board depends on being true."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

from app import scanner
from conftest import DEMO, WORKSPACE


def test_stage_is_derived_from_artefacts_not_from_the_status_line(demo_project):
    """`001-contradicting-status` says "Clarified — ready for planning" over a
    fully ticked task list. The prose is the oldest thing in the folder and the
    checkboxes are the newest, so the checkboxes win — and the card says why."""
    feature = next(f for f in demo_project.features if f.id == "001-contradicting-status")

    assert feature.status == "Clarified — ready for planning"
    assert feature.stage == "done"
    assert feature.stage_reason == "all 4 tasks ticked"
    assert (feature.progress.done, feature.progress.total) == (4, 4)
    assert feature.progress.pct == 100


def test_a_status_line_still_decides_when_there_is_no_task_list(demo_project):
    """The rule is "artefacts outrank prose", not "ignore prose": with no
    tasks.md there is no artefact to outrank it."""
    feature = next(f for f in demo_project.features if f.id == "002-planned-only")

    assert feature.stage == "plan"
    assert feature.stage_reason == "plan.md present, no tasks.md yet"
    assert feature.progress.total == 0


def test_the_current_feature_comes_from_specify_feature_json(demo_project):
    assert demo_project.current_feature == "002-planned-only"
    assert [f.is_current for f in demo_project.features if f.id == "002-planned-only"] == [True]


def test_progress_pct_survives_nested_serialisation(demo_project):
    """`pct` is a computed_field rather than a property: a plain property is
    silently dropped when the model is nested inside another model's dump."""
    dumped = demo_project.model_dump()
    feature = next(f for f in dumped["features"] if f["id"] == "001-contradicting-status")

    assert feature["progress"]["pct"] == 100


def _checksum(root: Path) -> list[tuple[str, int, str]]:
    """Every path under `root`, with size and content digest."""
    out: list[tuple[str, int, str]] = []
    for base, dirs, files in os.walk(root):
        dirs.sort()
        for name in sorted(files):
            path = Path(base) / name
            data = path.read_bytes()
            out.append((str(path.relative_to(root)), len(data), hashlib.sha256(data).hexdigest()))
        for name in sorted(dirs):
            out.append((str((Path(base) / name).relative_to(root)) + "/", 0, ""))
    return sorted(out)


def test_a_full_scan_leaves_the_tree_byte_for_byte_identical():
    """The first principle, asserted rather than promised: no cache file, no lock
    file, no "fixing" a malformed document, no mtime touched."""
    before = _checksum(WORKSPACE)
    assert before, "the fixture workspace is empty, so this test would prove nothing"

    snapshot = scanner.scan_all([WORKSPACE], with_git=False)
    assert snapshot.projects, "the scan found nothing, so it cannot have exercised the parsers"

    assert _checksum(WORKSPACE) == before


def test_two_projects_sharing_a_directory_name_get_distinct_ids():
    """A colliding id would merge two people's projects into one card stack."""
    ids = scanner.project_ids([Path("/a/x/app"), Path("/b/y/app"), Path("/c/solo")])

    assert ids[Path("/c/solo")] == ("solo", "solo")
    assert ids[Path("/a/x/app")][0] != ids[Path("/b/y/app")][0]
    assert len({value[0] for value in ids.values()}) == 3
    # The disambiguated label says which one it is, rather than adding a number.
    assert ids[Path("/a/x/app")] == ("x-app", "x/app")


def test_deeper_collisions_walk_further_up_the_path():
    ids = scanner.project_ids([Path("/one/w/app"), Path("/two/w/app")])

    assert len({value[0] for value in ids.values()}) == 2
    assert all("/" not in value[0] for value in ids.values())


def test_a_feature_that_cannot_be_read_is_reported_on_the_project(monkeypatch):
    """A feature silently missing from the board is indistinguishable from one
    that never existed, so the reason travels with the project."""
    real = scanner.scan_feature

    def explode(project, feature_dir, **kwargs):
        if feature_dir.name.startswith("002"):
            raise PermissionError(13, "Permission denied")
        return real(project, feature_dir, **kwargs)

    monkeypatch.setattr(scanner, "scan_feature", explode)
    project = scanner.scan_project(DEMO, with_git=False)

    assert project is not None
    assert [f.id for f in project.features] == ["001-contradicting-status"]
    assert project.error is not None
    assert "002-planned-only" in project.error
    assert "1 feature folder(s) could not be read" in project.error


def test_a_project_that_cannot_be_scanned_at_all_is_still_listed(monkeypatch):
    def explode(*args, **kwargs):
        raise OSError(5, "Input/output error")

    monkeypatch.setattr(scanner, "scan_project", explode)
    snapshot = scanner.scan_all([WORKSPACE], with_git=False)

    assert [p.id for p in snapshot.projects] == ["demo"]
    assert snapshot.projects[0].error is not None
    assert snapshot.projects[0].error.startswith("scan failed:")
    assert snapshot.projects[0].features == []


def test_discovery_does_not_descend_into_a_recognised_project():
    found = scanner.discover(WORKSPACE, max_depth=3)

    assert found == [DEMO]

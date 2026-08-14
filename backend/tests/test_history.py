"""The git-derived series, against a real repository with a real history."""

from __future__ import annotations

import pytest
from conftest import _git

from app import git, history


def test_the_series_follows_the_commits(repo):
    result = history.project_history(repo, "walked")

    assert result.available is True
    assert result.reason is None
    assert result.commits_scanned == 3
    assert [(p.done, p.total) for p in result.points] == [(0, 2), (1, 2), (2, 3)]
    assert [p.pct for p in result.points] == [0, 50, 67]
    assert [p.features for p in result.points] == [1, 1, 1]
    assert [p.subject for p in result.points] == [
        "feat: revision 1",
        "feat: revision 2",
        "feat: revision 3",
    ]


def test_the_series_reads_oldest_first(repo):
    points = history.project_history(repo, "walked").points

    assert [p.date for p in points] == sorted(p.date for p in points)


def test_the_total_moves_too(repo):
    """Work being added is the other half of the story; a chart of percentages
    alone would hide the third revision adding a task."""
    points = history.project_history(repo, "walked").points

    assert [p.total for p in points] == [2, 2, 3]


def test_the_stale_list_names_features_that_still_exist(repo):
    result = history.project_history(repo, "walked", titles={"001-walked-history": "Walked history"})

    assert [s.feature_id for s in result.stale] == ["001-walked-history"]
    assert result.stale[0].title == "Walked history"
    assert result.stale[0].subject == "feat: revision 3"
    assert result.stale[0].days >= 0


def test_a_deleted_feature_folder_is_left_out_of_the_stale_list(repo, monkeypatch):
    import shutil

    shutil.rmtree(repo / "specs" / "001-walked-history")
    try:
        result = history.project_history(repo, "walked")
        assert result.stale == []
    finally:
        pass


def test_the_series_is_cached_against_head(repo, monkeypatch):
    first = history.project_history(repo, "walked")

    calls: list[tuple] = []
    real = git.run

    def counting(*args, **kwargs):
        calls.append(args)
        return real(*args, **kwargs)

    monkeypatch.setattr(history.git, "run", counting)
    second = history.project_history(repo, "walked")

    assert second is first
    assert not [c for c in calls if "log" in c], "a cached series must not walk the log again"


def test_blobs_are_parsed_once_per_object(repo):
    history.project_history(repo, "walked")
    cached = dict(history._blob_cache)

    # Three commits over one file that changed each time: three distinct blobs.
    assert len(cached) == 3

    history._series_cache.clear()
    history.project_history(repo, "walked")
    assert dict(history._blob_cache) == cached


def test_the_caches_are_bounded(repo, monkeypatch):
    monkeypatch.setattr(history, "_CACHE_LIMIT", 1)
    monkeypatch.setattr(history, "_BLOB_LIMIT", 1)

    history.project_history(repo, "walked")
    history._series_cache.clear()
    history.project_history(repo, "walked")

    assert len(history._series_cache) <= 1
    assert len(history._blob_cache) <= 1


def test_a_project_that_is_not_a_repository_says_so(tmp_path):
    result = history.project_history(tmp_path, "orphan")

    assert result.available is False
    assert result.reason == "this project is not a git repository"
    assert result.points == []


def test_a_repository_with_no_commits_says_so(tmp_path, monkeypatch):
    monkeypatch.setattr(history.git, "is_repo", lambda path: True)
    monkeypatch.setattr(history.git, "head", lambda path: None)

    result = history.project_history(tmp_path, "empty")

    assert result.available is False
    assert result.reason == "this repository has no commits yet"


def test_a_log_that_cannot_be_read_says_so(repo, monkeypatch):
    # is_repo and head go through git.run too, so they are held steady and only
    # the log is made to fail — otherwise this would test the wrong branch.
    monkeypatch.setattr(history.git, "is_repo", lambda path: True)
    monkeypatch.setattr(history.git, "head", lambda path: "0" * 40)
    monkeypatch.setattr(history.git, "run", lambda *a, **k: None)

    result = history.project_history(repo, "walked")

    assert result.available is False
    assert result.reason == "git log could not be read"


def test_a_history_that_never_touched_specs_says_so(repo, monkeypatch):
    monkeypatch.setattr(history.git, "run", lambda *a, **k: "")

    result = history.project_history(repo, "walked")

    assert result.available is False
    assert result.reason == "no commit has touched specs/ yet"


def test_a_history_with_no_task_list_says_so(repo, monkeypatch):
    raw = "\x01abc123\x1f2026-01-01T10:00:00+00:00\x1ffeat: no tasks\nspecs/001-x/spec.md\n"
    monkeypatch.setattr(history.git, "run", lambda *a, **k: raw)

    result = history.project_history(repo, "walked")

    assert result.available is False
    assert "no tasks.md has ever been committed" in (result.reason or "")


def test_a_commit_list_of_only_malformed_lines_says_so(repo, monkeypatch):
    """Tolerant parsing: a header the format string could not have produced is
    skipped rather than raised on."""
    monkeypatch.setattr(history.git, "run", lambda *a, **k: "\x01broken-header-without-separators\n")

    result = history.project_history(repo, "walked")

    assert result.available is False
    assert result.reason == "no commit has touched specs/ yet"


def test_a_tasks_file_holding_no_countable_task_says_so(repo, monkeypatch):
    real_run = history.git.run

    def empty_tasks(cwd, *args, **kwargs):
        if args and args[0] == "log":
            return (
                "\x01" + git.head(repo) + "\x1f2026-01-01T10:00:00+00:00\x1ffeat: x\n"
                "specs/001-walked-history/tasks.md\n"
            )
        return real_run(cwd, *args, **kwargs)

    monkeypatch.setattr(history.git, "run", empty_tasks)
    monkeypatch.setattr(history, "_completion", lambda body: (0, 0))

    result = history.project_history(repo, "walked")

    assert result.available is False
    assert "no committed tasks.md holds any task" in (result.reason or "")


def test_a_blob_batch_that_fails_yields_no_ids(repo, monkeypatch):
    monkeypatch.setattr(history.git, "run_bytes", lambda *a, **k: None)

    result = history.project_history(repo, "walked")

    assert result.available is False


def test_blob_helpers_short_circuit_on_nothing_to_do(repo):
    assert history._blob_ids(repo, []) == {}
    assert history._blob_bodies(repo, []) == {}


def test_a_truncated_batch_payload_is_survived(repo, monkeypatch):
    """`cat-file --batch` output cut off mid-header must not raise."""
    monkeypatch.setattr(history.git, "run_bytes", lambda *a, **k: b"deadbeef blob")
    assert history._blob_bodies(repo, ["deadbeef"]) == {}

    monkeypatch.setattr(history.git, "run_bytes", lambda *a, **k: b"deadbeef blob notanumber\n")
    assert history._blob_bodies(repo, ["deadbeef"]) == {}

    monkeypatch.setattr(history.git, "run_bytes", lambda *a, **k: b"deadbeef missing\n")
    assert history._blob_bodies(repo, ["deadbeef"]) == {}


def test_an_unparseable_date_counts_as_today():
    assert history._days_since("not-a-date") == 0
    assert history._days_since("2026-01-01T10:00:00") >= 0


# --------------------------------------------------------------------------
# ordering — the series is a time series, so time orders it
# --------------------------------------------------------------------------


@pytest.fixture
def rebased_repo(tmp_path_factory):
    """A repository whose author dates run counter to its commit order.

    This is what a rebase leaves behind: it preserves the author date, so a
    branch commit written earlier lands on top of a squash commit created
    later. Ordinary, and it used to draw the trend line backwards.
    """
    root = tmp_path_factory.mktemp("rebased")
    feature = root / "specs" / "001-out-of-order"
    feature.mkdir(parents=True)
    _git(root, "init", "--initial-branch=main")

    # Third commit is authored *before* the second, exactly as a rebase leaves it.
    revisions = [
        ("- [ ] T001 one\n- [ ] T002 two\n", "2026-01-01T10:00:00+00:00"),
        ("- [x] T001 one\n- [ ] T002 two\n", "2026-01-03T10:00:00+00:00"),
        ("- [x] T001 one\n- [x] T002 two\n", "2026-01-02T10:00:00+00:00"),
    ]
    for index, (body, authored) in enumerate(revisions, start=1):
        (feature / "tasks.md").write_text(f"# Tasks\n\n## Phase 1: Setup\n\n{body}", encoding="utf-8")
        _git(root, "add", "-A")
        _git(
            root,
            "-c",
            "commit.gpgsign=false",
            "commit",
            "--no-verify",
            "-m",
            f"feat: revision {index}",
            "--date",
            authored,
        )
    return root


def test_a_rebased_history_still_reads_oldest_to_newest(rebased_repo):
    """The defect CI caught on a rebased branch: the chart's last segment
    travelled backwards in time, because the series was ordered by the order
    git printed its commits rather than by the date on each point."""
    points = history.project_history(rebased_repo, "rebased").points

    dates = [p.date for p in points]
    assert dates == sorted(dates), dates
    # And the fixture genuinely reproduces it: git's own order is not sorted.
    assert [p.subject for p in points] != ["feat: revision 1", "feat: revision 2", "feat: revision 3"]


def test_the_last_point_is_the_most_recent_because_the_card_reports_it(rebased_repo):
    points = history.project_history(rebased_repo, "rebased").points

    assert points[-1].date == max(p.date for p in points)


def test_an_already_ordered_history_is_unchanged(repo):
    points = history.project_history(repo, "walked").points

    assert [p.subject for p in points] == [
        "feat: revision 1",
        "feat: revision 2",
        "feat: revision 3",
    ]


def test_a_date_that_cannot_be_parsed_sorts_rather_than_raising():
    """A scanner bug is not a reason for the sort to take the process down."""
    assert history._instant("not a date") < history._instant("2026-01-01T00:00:00+00:00")


def test_dates_are_compared_as_instants_rather_than_as_text():
    """`%aI` carries an offset, so two commits in different timezones sort by
    that offset if compared as strings."""
    later_text_earlier_instant = "2026-01-01T09:00:00+05:00"  # 04:00 UTC
    earlier_text_later_instant = "2026-01-01T08:00:00+00:00"  # 08:00 UTC

    assert later_text_earlier_instant > earlier_text_later_instant
    assert history._instant(later_text_earlier_instant) < history._instant(
        earlier_text_later_instant
    )

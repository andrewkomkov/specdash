"""Completion over time, read out of git rather than out of a database.

SpecDash stores nothing. The series below is reconstructed on demand by walking
the commits that touched a project's `specs/` directory and parsing each
revision's `tasks.md` files exactly the way the board parses the ones on disk,
so a point on the chart and a card on the board are counted by the same code.

Two git processes do the whole walk regardless of how long the history is: one
`log` for the commit list, one `cat-file --batch-check` to resolve every
`<commit>:<path>` to a blob id, and one more `cat-file --batch` for the blobs
that have not been parsed before. Blobs are cached by object id, so the common
case — a new commit that touched one file — reparses one file.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from . import git, parsing
from .models import HistoryPoint, ProjectHistory, StaleFeature

log = logging.getLogger("specdash.history")

MAX_STALE = 6

# (project path, HEAD sha) -> series. HEAD moving is the only thing that can
# change the answer, so it is the whole cache key.
_series_cache: dict[tuple[str, str], ProjectHistory] = {}
_CACHE_LIMIT = 32

# blob id -> (done, total). Blob ids are content hashes, so this never goes stale.
_blob_cache: dict[str, tuple[int, int]] = {}
_BLOB_LIMIT = 4096


def _unavailable(project_id: str, reason: str) -> ProjectHistory:
    return ProjectHistory(project_id=project_id, available=False, reason=reason)


def _remember(key: tuple[str, str], value: ProjectHistory) -> ProjectHistory:
    if len(_series_cache) >= _CACHE_LIMIT:
        _series_cache.pop(next(iter(_series_cache)))
    _series_cache[key] = value
    return value


def _parse_log(raw: str) -> tuple[list[tuple[str, str, str]], dict[str, tuple[str, str]], set[str]]:
    """Split `git log --name-only` output into commits, last-touch dates and paths.

    Returns the commits newest first, a map of feature directory to the newest
    commit that touched it, and every `tasks.md` path seen anywhere in the range.
    """
    commits: list[tuple[str, str, str]] = []
    touched: dict[str, tuple[str, str]] = {}
    task_paths: set[str] = set()

    for block in raw.split("\x01"):
        if not block.strip():
            continue
        head, *rest = block.splitlines()
        parts = head.split("\x1f", 2)
        if len(parts) != 3:
            continue
        sha, date, subject = parts
        commits.append((sha, date, subject))
        for path in rest:
            path = path.strip()
            if not path:
                continue
            segments = path.split("/")
            if len(segments) >= 2 and segments[0] == "specs":
                # commits arrive newest first, so the first write wins
                touched.setdefault(segments[1], (date, subject))
            if path.endswith("/tasks.md"):
                task_paths.add(path)
    return commits, touched, task_paths


def _blob_ids(project_path: Path, requests: list[str]) -> dict[str, str]:
    """Resolve `<commit>:<path>` to blob ids, skipping the ones that did not exist."""
    if not requests:
        return {}
    payload = ("\n".join(requests) + "\n").encode()
    raw = git.run_bytes(project_path, "cat-file", "--batch-check", stdin=payload)
    if raw is None:
        return {}
    out: dict[str, str] = {}
    for request, line in zip(requests, raw.decode("utf-8", "replace").splitlines()):
        fields = line.split()
        if len(fields) >= 2 and fields[1] == "blob":
            out[request] = fields[0]
    return out


def _blob_bodies(project_path: Path, ids: list[str]) -> dict[str, bytes]:
    """Fetch blob contents in one batch. Output is `<id> blob <size>\\n<bytes>\\n`."""
    if not ids:
        return {}
    payload = ("\n".join(ids) + "\n").encode()
    raw = git.run_bytes(project_path, "cat-file", "--batch", stdin=payload)
    if raw is None:
        return {}
    out: dict[str, bytes] = {}
    at = 0
    while at < len(raw):
        end = raw.find(b"\n", at)
        if end == -1:
            break
        header = raw[at:end].decode("utf-8", "replace").split()
        at = end + 1
        if len(header) < 3 or header[1] != "blob":
            continue  # "<id> missing"
        try:
            size = int(header[2])
        except ValueError:
            break
        out[header[0]] = raw[at : at + size]
        at += size + 1
    return out


def _completion(body: bytes) -> tuple[int, int]:
    _, tasks = parsing.parse_tasks(body.decode("utf-8", "replace"))
    return sum(1 for t in tasks if t.done), len(tasks)


def _days_since(iso: str) -> int:
    try:
        when = datetime.fromisoformat(iso)
    except ValueError:
        return 0
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    return max(0, (datetime.now(timezone.utc) - when).days)


def project_history(
    project_path: Path,
    project_id: str,
    *,
    limit: int = 200,
    titles: dict[str, str] | None = None,
) -> ProjectHistory:
    """Task completion per commit, oldest first, plus the features gone quietest."""
    if not git.is_repo(project_path):
        return _unavailable(project_id, "this project is not a git repository")

    head = git.head(project_path)
    if head is None:
        return _unavailable(project_id, "this repository has no commits yet")

    key = (str(project_path), head)
    cached = _series_cache.get(key)
    if cached is not None:
        return cached

    raw = git.run(
        project_path,
        "log",
        f"-{limit}",
        "--no-merges",
        "--format=%x01%H%x1f%aI%x1f%s",
        "--name-only",
        "--",
        "specs",
        timeout=30,
    )
    if raw is None:
        return _remember(key, _unavailable(project_id, "git log could not be read"))
    if not raw.strip():
        return _remember(key, _unavailable(project_id, "no commit has touched specs/ yet"))

    commits, touched, task_paths = _parse_log(raw)
    if not commits:
        return _remember(key, _unavailable(project_id, "no commit has touched specs/ yet"))
    if not task_paths:
        return _remember(
            key,
            _unavailable(project_id, "no tasks.md has ever been committed, so there is nothing to count"),
        )

    ordered_paths = sorted(task_paths)
    requests = [f"{sha}:{path}" for sha, _, _ in commits for path in ordered_paths]
    ids = _blob_ids(project_path, requests)

    unknown = sorted({oid for oid in ids.values() if oid not in _blob_cache})
    for oid, body in _blob_bodies(project_path, unknown).items():
        if len(_blob_cache) >= _BLOB_LIMIT:
            _blob_cache.pop(next(iter(_blob_cache)))
        _blob_cache[oid] = _completion(body)

    points: list[HistoryPoint] = []
    for sha, date, subject in commits:
        done = total = files = 0
        for path in ordered_paths:
            oid = ids.get(f"{sha}:{path}")
            counted = _blob_cache.get(oid) if oid else None
            if counted is None:
                continue
            done += counted[0]
            total += counted[1]
            files += 1
        if not total:
            continue  # a revision predating any task list is not a data point
        points.append(
            HistoryPoint(sha=sha, date=date, subject=subject, done=done, total=total, features=files)
        )
    points.reverse()  # oldest first: a chart reads left to right

    if not points:
        return _remember(
            key, _unavailable(project_id, "no committed tasks.md holds any task to count")
        )

    stale = [
        StaleFeature(
            feature_id=feature_id,
            title=(titles or {}).get(feature_id),
            date=date,
            days=_days_since(date),
            subject=subject,
        )
        for feature_id, (date, subject) in touched.items()
        if (project_path / "specs" / feature_id).is_dir()
    ]
    stale.sort(key=lambda s: s.days, reverse=True)

    log.info(
        "history for %s: %d point(s) over %d commit(s), %d blob(s) cached",
        project_id,
        len(points),
        len(commits),
        len(_blob_cache),
    )
    return _remember(
        key,
        ProjectHistory(
            project_id=project_id,
            available=True,
            points=points,
            stale=stale[:MAX_STALE],
            commits_scanned=len(commits),
        ),
    )

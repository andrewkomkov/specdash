"""Filesystem scanning. Strictly read-only: open/stat/listdir and nothing else.

A project qualifies if it holds a `.specify/` directory or a `specs/` directory
with at least one numbered feature folder.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import logging
import os
import re
import time
from pathlib import Path

from . import git, parsing
from .models import (
    Artifact,
    Commit,
    Feature,
    Progress,
    Project,
    Snapshot,
    Stage,
    UserStory,
)

log = logging.getLogger("specdash.scanner")

FEATURE_DIR_RE = re.compile(r"^(\d{1,4})[-_](.+)$")
IGNORED_DIRS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "target",
    ".gradle",
    ".idea",
    "vendor",
    ".next",
    "Pods",
}

KNOWN_ARTIFACTS: list[tuple[str, str]] = [
    ("spec.md", "Spec"),
    ("plan.md", "Plan"),
    ("tasks.md", "Tasks"),
    ("research.md", "Research"),
    ("data-model.md", "Data model"),
    ("quickstart.md", "Quickstart"),
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _artifact(path: Path, rel: str, key: str, label: str) -> Artifact:
    st = path.stat()
    text = ""
    with contextlib.suppress(OSError):
        text = _read(path)
    return Artifact(
        key=key,
        file=rel,
        label=label,
        bytes=st.st_size,
        modified=st.st_mtime,
        headings=sum(1 for line in text.splitlines() if line.startswith("#")),
        words=len(text.split()),
    )


def _decide_stage(
    *,
    has_spec: bool,
    has_plan: bool,
    has_tasks: bool,
    progress: Progress,
    clarified: bool,
    status: str | None,
    open_questions: int,
) -> tuple[Stage, str]:
    """Where a feature sits in the spec-kit pipeline, and why.

    Evidence on disk wins over prose: a `**Status**` line saying "ready for
    planning" does not move a feature that already has a full task list.
    """
    if has_tasks and progress.total:
        if progress.done == progress.total:
            return "done", f"all {progress.total} tasks ticked"
        if progress.done:
            return "implement", f"{progress.done}/{progress.total} tasks ticked"
        return "tasks", f"{progress.total} tasks, none started"
    if has_tasks:
        return "tasks", "tasks.md present"
    if has_plan:
        return "plan", "plan.md present, no tasks.md yet"

    status_low = (status or "").lower()
    if open_questions:
        return "specify", f"{open_questions} open clarification marker(s)"
    if clarified or any(
        w in status_low for w in ("clarified", "ready for plan", "ready to plan", "approved")
    ):
        return "clarify", "spec clarified, awaiting plan"
    if has_spec:
        return "specify", "spec.md only"
    return "specify", "no spec.md found"


def _story_stage(
    done: int, total: int, feature: tuple[Stage, str], *, feature_has_tasks: bool
) -> tuple[Stage, str]:
    """Where one user story sits, on the same evidence rule as a whole feature.

    A story with tasks of its own is placed by its own tick counts. A story with
    none has not been cut into work, so it sits wherever its feature sits — and
    says which of the two reasons applies, rather than implying progress it has
    no evidence for.
    """
    if total:
        if done == total:
            return "done", f"all {total} tasks ticked"
        if done:
            return "implement", f"{done}/{total} tasks ticked"
        return "tasks", f"{total} tasks, none started"
    stage, reason = feature
    if feature_has_tasks:
        return stage, "no task in tasks.md names this story"
    return stage, reason


def feature_commits(project_path: Path, rel_dir: str, limit: int = 10) -> list[Commit]:
    """History touching one feature directory. Called on demand, never during a scan:
    a git process per feature would dominate the rescan that follows every save."""
    raw = git.run(
        project_path,
        "log",
        f"-{limit}",
        "--no-merges",
        "--date=relative",
        "--format=%h%x1f%s%x1f%an%x1f%aI%x1f%ad",
        "--",
        rel_dir,
    )
    if not raw:
        return []
    commits: list[Commit] = []
    for line in raw.splitlines():
        parts = line.split("\x1f")
        if len(parts) != 5:
            continue
        commits.append(
            Commit(
                sha=parts[0],
                subject=parts[1],
                author=parts[2],
                date=parts[3],
                relative=parts[4],
            )
        )
    return commits


def scan_feature(project: Project, feature_dir: Path, *, with_git: bool) -> Feature:
    dir_name = feature_dir.name
    m = FEATURE_DIR_RE.match(dir_name)
    number = m.group(1) if m else None
    slug = m.group(2) if m else dir_name

    artifacts: list[Artifact] = []
    texts: dict[str, str] = {}
    modified = feature_dir.stat().st_mtime

    # Listing the directory up front rather than probing file by file: every
    # per-file check swallows a permission error and returns False, so a folder
    # nobody can read would otherwise render as a feature holding nothing. This
    # raises, and the reason ends up on the project.
    entries = sorted(path.name for path in feature_dir.iterdir())

    for filename, label in KNOWN_ARTIFACTS:
        path = feature_dir / filename
        if filename not in entries or not path.is_file():
            continue
        key = filename[:-3]
        artifacts.append(_artifact(path, filename, key, label))
        try:
            texts[key] = _read(path)
        except OSError:
            texts[key] = ""
        modified = max(modified, path.stat().st_mtime)

    contracts_dir = feature_dir / "contracts"
    if contracts_dir.is_dir():
        for path in sorted(contracts_dir.iterdir()):
            if path.is_file() and path.suffix in (".md", ".yaml", ".yml", ".json"):
                rel = f"contracts/{path.name}"
                artifacts.append(_artifact(path, rel, rel, f"Contract · {path.stem}"))
                modified = max(modified, path.stat().st_mtime)

    known = {a[0] for a in KNOWN_ARTIFACTS}
    for name in entries:
        path = feature_dir / name
        if name in known or not name.endswith(".md") or not path.is_file():
            continue
        artifacts.append(_artifact(path, name, name, path.stem.replace("-", " ").title()))
        modified = max(modified, path.stat().st_mtime)

    spec = parsing.parse_spec(texts.get("spec", "")) if "spec" in texts else parsing.SpecInfo()
    phases, tasks = parsing.parse_tasks(texts["tasks"]) if "tasks" in texts else ([], [])
    plan_summary, tech = parsing.parse_plan(texts["plan"]) if "plan" in texts else (None, {})

    checklists = []
    checklist_dir = feature_dir / "checklists"
    if checklist_dir.is_dir():
        for path in sorted(checklist_dir.glob("*.md")):
            rel = f"checklists/{path.name}"
            try:
                checklists.append(parsing.parse_checklist(path.stem, rel, _read(path)))
            except OSError:
                continue
            artifacts.append(_artifact(path, rel, rel, f"Checklist · {path.stem}"))
            modified = max(modified, path.stat().st_mtime)

    progress = Progress(done=sum(1 for t in tasks if t.done), total=len(tasks))
    checklist_progress = Progress(
        done=sum(c.done for c in checklists), total=sum(c.total for c in checklists)
    )

    # Fold task counts into the user stories they serve.
    by_story: dict[str, list] = {}
    for t in tasks:
        if t.story:
            by_story.setdefault(t.story, []).append(t)
    for story in spec.user_stories:
        owned = by_story.get(story.id, [])
        story.total = len(owned)
        story.done = sum(1 for t in owned if t.done)
    # A story named only in tasks.md still deserves a row on the card.
    known = {s.id for s in spec.user_stories}
    for story_id, owned in sorted(by_story.items()):
        if story_id in known:
            continue
        phase = next((p for p in phases if p.story == story_id), None)
        spec.user_stories.append(
            parsing.UserStory(
                id=story_id,
                number=int(story_id[2:]) if story_id[2:].isdigit() else 99,
                title=phase.title if phase else story_id,
                priority=phase.priority if phase else None,
                done=sum(1 for t in owned if t.done),
                total=len(owned),
            )
        )
    spec.user_stories.sort(key=lambda s: s.number)

    stage, reason = _decide_stage(
        has_spec="spec" in texts,
        has_plan="plan" in texts,
        has_tasks="tasks" in texts,
        progress=progress,
        clarified=bool(spec.clarifications),
        status=spec.status,
        open_questions=len(spec.open_questions),
    )

    for story in spec.user_stories:
        story.stage, story.stage_reason = _story_stage(
            story.done, story.total, (stage, reason), feature_has_tasks="tasks" in texts
        )

    # Setup, foundational and polish work belongs to no story. On a board of
    # stories it would simply vanish, and the column totals would stop adding up.
    loose = [t for t in tasks if not t.story]
    unassigned = None
    if loose:
        loose_done = sum(1 for t in loose if t.done)
        loose_stage, loose_reason = _story_stage(
            loose_done, len(loose), (stage, reason), feature_has_tasks=True
        )
        unassigned = UserStory(
            id="—",
            number=0,
            title="Tasks with no story",
            done=loose_done,
            total=len(loose),
            stage=loose_stage,
            stage_reason=loose_reason,
        )

    title = spec.title or slug.replace("-", " ").title()

    return Feature(
        id=dir_name,
        project_id=project.id,
        number=number,
        slug=slug,
        title=title,
        stage=stage,
        stage_reason=reason,
        status=spec.status,
        branch=spec.branch or dir_name,
        created=spec.created,
        is_current=project.current_feature == dir_name,
        summary=spec.summary or plan_summary,
        input=spec.input,
        progress=progress,
        checklist_progress=checklist_progress,
        artifacts=artifacts,
        user_stories=spec.user_stories,
        unassigned=unassigned,
        phases=phases,
        tasks=tasks,
        checklists=checklists,
        requirements=spec.requirements,
        success_criteria=spec.success_criteria,
        edge_cases=spec.edge_cases,
        clarifications=spec.clarifications,
        tech=tech,
        open_questions=spec.open_questions,
        modified=modified,
    )


def project_ids(paths: list[Path]) -> dict[Path, tuple[str, str]]:
    """Stable `(id, display name)` per project path, unique across the whole scan.

    Two checkouts called `app` under different parents are two different projects
    and must not share an id — the id keys the API, the filter and the drawer. A
    unique directory name is left alone, because that is almost always the case
    and a readable id is worth keeping; a clash is disambiguated by walking up
    the path until the names differ, and falls back to a digest of the full path
    for the pathological case where they never do.
    """
    out: dict[Path, tuple[str, str]] = {}
    by_name: dict[str, list[Path]] = {}
    for path in paths:
        by_name.setdefault(path.name, []).append(path)

    for name, group in by_name.items():
        if len(group) == 1:
            out[group[0]] = (name, name)
            continue
        for path in group:
            parts = path.parts
            label = name
            for depth in range(2, min(len(parts), 5) + 1):
                label = "/".join(parts[-depth:])
                if sum(1 for other in group if "/".join(other.parts[-depth:]) == label) == 1:
                    break
            else:
                digest = hashlib.sha1(str(path).encode()).hexdigest()[:7]
                out[path] = (f"{name}-{digest}", f"{name} ({digest})")
                continue
            out[path] = (re.sub(r"[^A-Za-z0-9._-]+", "-", label).strip("-"), label)
    return out


def scan_project(path: Path, *, project_id: str | None = None, name: str | None = None,
                 with_git: bool = True) -> Project | None:
    specify_dir = path / ".specify"
    specs_dir = path / "specs"
    if not specify_dir.is_dir() and not specs_dir.is_dir():
        return None

    project = Project(
        id=project_id or path.name,
        name=name or path.name,
        path=str(path),
        has_specify=specify_dir.is_dir(),
        modified=path.stat().st_mtime,
    )

    feature_json = specify_dir / "feature.json"
    if feature_json.is_file():
        try:
            data = json.loads(_read(feature_json))
            current = data.get("feature_directory") or data.get("featureDirectory")
            if isinstance(current, str):
                project.current_feature = current.rstrip("/").split("/")[-1]
        except (OSError, ValueError):
            pass

    constitution = specify_dir / "memory" / "constitution.md"
    if constitution.is_file():
        try:
            text = _read(constitution)
            project.constitution = text
            vm = re.search(r"\*\*Version\*\*\s*:\s*([0-9]+\.[0-9]+\.[0-9]+)", text)
            project.constitution_version = vm.group(1) if vm else None
        except OSError:
            pass

    if with_git and (path / ".git").exists():
        project.branch = git.run(path, "rev-parse", "--abbrev-ref", "HEAD")

    skipped: list[str] = []
    if specs_dir.is_dir():
        for child in sorted(specs_dir.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            try:
                feature = scan_feature(project, child, with_git=with_git)
            except Exception as exc:  # one bad folder must not blank the board
                log.warning("skipping %s: %s", child, exc, exc_info=True)
                skipped.append(f"{child.name}: {exc}")
                continue
            project.features.append(feature)
            project.modified = max(project.modified, feature.modified)

    if skipped:
        # Recorded on the project rather than only logged: a feature silently
        # missing from the board is indistinguishable from one that never existed.
        project.error = f"{len(skipped)} feature folder(s) could not be read — " + "; ".join(
            skipped[:3]
        )

    # Newest feature number first — that is the one being worked on.
    project.features.sort(key=lambda f: (f.number or "", f.id), reverse=True)

    if not project.features and not project.has_specify:
        return None
    return project


def discover(root: Path, max_depth: int = 2) -> list[Path]:
    """Directories under `root` that look like spec-kit projects."""
    found: list[Path] = []

    def walk(current: Path, depth: int) -> None:
        if depth > max_depth:
            return
        try:
            children = sorted(current.iterdir())
        except OSError:
            return
        if (current / ".specify").is_dir() or (current / "specs").is_dir():
            found.append(current)
            return  # do not descend into a project
        for child in children:
            if child.is_dir() and not child.name.startswith(".") and child.name not in IGNORED_DIRS:
                walk(child, depth + 1)

    walk(root, 0)
    return found


def scan_all(
    roots: list[Path],
    *,
    explicit: list[Path] | None = None,
    with_git: bool = True,
    max_depth: int = 2,
) -> Snapshot:
    started = time.perf_counter()
    candidates: list[Path] = list(explicit or [])
    for root in roots:
        candidates.extend(discover(root, max_depth))

    unique: list[Path] = []
    seen: set[str] = set()
    for path in candidates:
        try:
            real = str(path.resolve())
        except OSError:
            real = str(path)
        if real in seen:
            continue
        seen.add(real)
        unique.append(path)

    ids = project_ids(unique)
    projects: list[Project] = []
    for path in unique:
        project_id, name = ids[path]
        try:
            project = scan_project(path, project_id=project_id, name=name, with_git=with_git)
        except Exception as exc:
            # Still listed, with the reason attached: a project that vanishes from
            # the board looks like a project that was never configured.
            log.warning("cannot scan %s: %s", path, exc, exc_info=True)
            projects.append(
                Project(id=project_id, name=name, path=str(path), error=f"scan failed: {exc}")
            )
            continue
        if project:
            projects.append(project)

    projects.sort(key=lambda p: p.modified, reverse=True)
    return Snapshot(
        generated_at=time.time(),
        root=os.pathsep.join(str(r) for r in roots),
        projects=projects,
        scan_ms=int((time.perf_counter() - started) * 1000),
    )

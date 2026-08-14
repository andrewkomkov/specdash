"""What spec-kit itself installed into a project, and the process it declared.

Three small JSON files and one YAML file per workflow, all under `.specify/`.
They are read once per project rather than once per feature, so the cost does
not scale with the thing that dominates a scan.

Everything here is read-only in the strong sense of Principle I: files are
opened for reading, hashed and compared. A digest that does not match is
reported, never repaired, and nothing is cached beside the file it describes.

One rule is new with this module. An integration manifest is *data from a
scanned project* that names paths to open, which is the first time SpecDash lets
a scanned file decide what it reads. Every such path is therefore resolved and
required to land inside the project directory; one that escapes is refused.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import logging
from pathlib import Path

import yaml

from .models import DeclaredWorkflow, ManifestFile, Toolchain, WorkflowStep

log = logging.getLogger("specdash.toolchain")

# Far above anything spec-kit installs — a SKILL.md is a few kilobytes. The
# bound therefore only ever fires on a file that is not what the manifest
# thinks it is, which is exactly the case where reading it whole is unwise.
MAX_HASHED_BYTES = 4 * 1024 * 1024
HASH_CHUNK = 64 * 1024


def _load_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def _digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        while chunk := fh.read(HASH_CHUNK):
            h.update(chunk)
    return h.hexdigest()


def verify_file(project_root: Path, rel_path: str, expected: str) -> ManifestFile:
    """One manifest entry, checked against the digest spec-kit recorded.

    Containment is checked before anything is opened, because the question
    "should this be read at all" has to be settled before the read.
    """
    candidate = project_root / rel_path
    try:
        resolved = candidate.resolve()
        root = project_root.resolve()
    except OSError as exc:
        return ManifestFile(path=rel_path, state="unverified", reason=str(exc))

    if not resolved.is_relative_to(root):
        return ManifestFile(
            path=rel_path,
            state="unverified",
            reason="path resolves outside the project directory",
        )

    try:
        stat = resolved.stat()
    except OSError:
        return ManifestFile(path=rel_path, state="missing")
    if not resolved.is_file():
        return ManifestFile(path=rel_path, state="missing", reason="not a regular file")
    if stat.st_size > MAX_HASHED_BYTES:
        return ManifestFile(
            path=rel_path, state="unverified", reason=f"larger than {MAX_HASHED_BYTES} bytes"
        )

    try:
        actual = _digest(resolved)
    except OSError as exc:
        return ManifestFile(path=rel_path, state="unverified", reason=str(exc))
    return ManifestFile(path=rel_path, state="ok" if actual == expected else "modified")


def read_toolchain(project_root: Path) -> Toolchain | None:
    """Version, integration and installed-file integrity, or None if untracked.

    A project initialised by an older spec-kit, or never initialised at all, has
    none of these files. That is not an error and produces no toolchain — which
    is why the return is nullable rather than an empty object.
    """
    specify = project_root / ".specify"
    integration = _load_json(specify / "integration.json")
    options = _load_json(specify / "init-options.json")
    manifests = sorted((specify / "integrations").glob("*.manifest.json"))

    if integration is None and options is None and not manifests:
        return None

    integration = integration or {}
    options = options or {}
    settings = integration.get("integration_settings")
    active = integration.get("integration") or options.get("integration")
    script = options.get("script")
    if not script and isinstance(settings, dict) and isinstance(active, str):
        entry = settings.get(active)
        if isinstance(entry, dict):
            script = entry.get("script")

    installed = integration.get("installed_integrations")
    result = Toolchain(
        speckit_version=_as_str(integration.get("version") or options.get("speckit_version")),
        integration=_as_str(active),
        integrations=[i for i in installed if isinstance(i, str)]
        if isinstance(installed, list)
        else [],
        script=_as_str(script),
        feature_numbering=_as_str(options.get("feature_numbering")),
    )

    for manifest_path in manifests:
        manifest = _load_json(manifest_path)
        files = (manifest or {}).get("files")
        if not isinstance(files, dict):
            continue
        if result.speckit_version is None:
            result.speckit_version = _as_str((manifest or {}).get("version"))
        for rel_path, expected in sorted(files.items()):
            if isinstance(rel_path, str) and isinstance(expected, str):
                result.files.append(verify_file(project_root, rel_path, expected))
    return result


def _as_str(value: object) -> str | None:
    return value if isinstance(value, str) and value else None


def _step_from(raw: object, index: int) -> WorkflowStep | None:
    if not isinstance(raw, dict):
        return None
    step_id = _as_str(raw.get("id")) or f"step-{index + 1}"
    if raw.get("type") == "gate":
        return WorkflowStep(
            id=step_id,
            kind="gate",
            message=_as_str(raw.get("message")),
            on_reject=_as_str(raw.get("on_reject")),
        )
    command = _as_str(raw.get("command"))
    if command is None:
        return None
    return WorkflowStep(id=step_id, kind="command", command=command)


def _workflow_from_file(path: Path, workflow_id: str) -> DeclaredWorkflow:
    """One `workflow.yml`, or a workflow object carrying the reason it is empty.

    `safe_load`, not `load`: the file comes from a scanned project, and `load`
    would let that project construct Python objects inside this process.
    """
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8", errors="replace"))
    except (OSError, yaml.YAMLError) as exc:
        return DeclaredWorkflow(id=workflow_id, error=f"unreadable: {_one_line(exc)}")

    if not isinstance(data, dict):
        return DeclaredWorkflow(id=workflow_id, error="not a workflow document")

    meta = data.get("workflow")
    meta = meta if isinstance(meta, dict) else {}
    raw_steps = data.get("steps")
    if not isinstance(raw_steps, list) or not raw_steps:
        return DeclaredWorkflow(
            id=_as_str(meta.get("id")) or workflow_id,
            name=_as_str(meta.get("name")),
            error="declares no steps",
        )

    steps = [s for i, raw in enumerate(raw_steps) if (s := _step_from(raw, i))]
    return DeclaredWorkflow(
        id=_as_str(meta.get("id")) or workflow_id,
        name=_as_str(meta.get("name")),
        version=_as_str(meta.get("version")),
        description=_as_str(meta.get("description")),
        steps=steps,
    )


def _one_line(exc: object) -> str:
    return " ".join(str(exc).split())[:200]


def read_workflows(project_root: Path) -> list[DeclaredWorkflow]:
    """Workflows a project declared, file first and registry second.

    The registry is a record of what was installed; the file is what would
    actually run. Where they disagree the file wins, and a registry entry whose
    file has gone is still listed — a workflow that vanished is worth seeing.
    """
    workflows_dir = project_root / ".specify" / "workflows"
    if not workflows_dir.is_dir():
        return []

    registry = _load_json(workflows_dir / "workflow-registry.json") or {}
    entries = registry.get("workflows")
    entries = entries if isinstance(entries, dict) else {}

    out: dict[str, DeclaredWorkflow] = {}
    with contextlib.suppress(OSError):
        for child in sorted(workflows_dir.iterdir()):
            path = child / "workflow.yml"
            if not child.is_dir() or not path.is_file():
                continue
            workflow = _workflow_from_file(path, child.name)
            if workflow.error:
                log.info("workflow %s skipped: %s", path, workflow.error)
            out[child.name] = workflow

    for workflow_id, meta in sorted(entries.items()):
        if not isinstance(workflow_id, str) or not isinstance(meta, dict):
            continue
        existing = out.get(workflow_id)
        if existing is None:
            out[workflow_id] = DeclaredWorkflow(
                id=workflow_id,
                name=_as_str(meta.get("name")),
                version=_as_str(meta.get("version")),
                description=_as_str(meta.get("description")),
                source=_as_str(meta.get("source")),
                error="listed in the registry but no workflow.yml on disk",
            )
            continue
        # The file wins on everything it states; the registry fills the gaps and
        # is the only place `source` is recorded at all.
        existing.source = _as_str(meta.get("source"))
        existing.name = existing.name or _as_str(meta.get("name"))
        existing.version = existing.version or _as_str(meta.get("version"))
        existing.description = existing.description or _as_str(meta.get("description"))

    return [out[key] for key in sorted(out)]

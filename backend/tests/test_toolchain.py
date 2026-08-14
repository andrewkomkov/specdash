"""Provenance and declared process, read from `.specify/`.

These run against real files in a real temporary tree rather than against
mocks: the whole point of manifest verification is that it hashes what is
actually on disk, and a mocked `open` would only prove the mock was wired up.
"""

from __future__ import annotations

import hashlib
import json

import pytest
import yaml

from app import toolchain

WORKFLOW = {
    "workflow": {
        "id": "speckit",
        "name": "Full SDD Cycle",
        "version": "1.0.0",
        "description": "Runs specify → plan → tasks → implement with review gates",
    },
    "steps": [
        {"id": "specify", "command": "speckit.specify"},
        {
            "id": "review-spec",
            "type": "gate",
            "message": "Review the generated spec before planning.",
            "on_reject": "abort",
        },
    ],
}


def write(path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def digest_of(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


@pytest.fixture
def project(tmp_path):
    (tmp_path / ".specify").mkdir()
    return tmp_path


# --------------------------------------------------------------------------
# verify_file
# --------------------------------------------------------------------------


def test_a_file_matching_its_digest_is_ok(project):
    write(project / ".claude" / "skills" / "a.md", "hello")

    result = toolchain.verify_file(project, ".claude/skills/a.md", digest_of("hello"))

    assert result.state == "ok"
    assert result.reason is None


def test_a_file_that_no_longer_matches_is_modified(project):
    write(project / "a.md", "edited by hand")

    assert toolchain.verify_file(project, "a.md", digest_of("hello")).state == "modified"


def test_a_file_that_is_gone_is_missing(project):
    result = toolchain.verify_file(project, "a.md", digest_of("hello"))

    assert result.state == "missing"
    assert result.reason is None


def test_a_directory_where_a_file_was_expected_is_missing_with_a_reason(project):
    (project / "a.md").mkdir()

    result = toolchain.verify_file(project, "a.md", digest_of("hello"))

    assert result.state == "missing"
    assert result.reason == "not a regular file"


def test_a_manifest_path_escaping_the_project_is_refused(project, tmp_path):
    """A manifest is data from a scanned project naming paths to open.

    Following one out of the tree would be the first time a scanned file decided
    what SpecDash reads, so containment is checked before anything is opened.
    """
    outside = tmp_path.parent / "outside.md"
    outside.write_text("secrets", encoding="utf-8")

    result = toolchain.verify_file(project, "../outside.md", digest_of("secrets"))

    assert result.state == "unverified"
    assert "outside the project" in (result.reason or "")


def test_a_symlink_pointing_out_of_the_project_is_refused_too(project, tmp_path):
    outside = tmp_path.parent / "linked.md"
    outside.write_text("secrets", encoding="utf-8")
    (project / "link.md").symlink_to(outside)

    result = toolchain.verify_file(project, "link.md", digest_of("secrets"))

    assert result.state == "unverified"
    assert "outside the project" in (result.reason or "")


def test_a_file_over_the_bound_is_reported_rather_than_read(project, monkeypatch):
    monkeypatch.setattr(toolchain, "MAX_HASHED_BYTES", 4)
    write(project / "big.md", "far more than four bytes")

    result = toolchain.verify_file(project, "big.md", digest_of("x"))

    assert result.state == "unverified"
    assert "larger than 4 bytes" in (result.reason or "")


def test_a_file_that_cannot_be_resolved_is_unverified(project, monkeypatch):
    def boom(self, *args, **kwargs):
        raise OSError("name too long")

    monkeypatch.setattr("pathlib.Path.resolve", boom)

    result = toolchain.verify_file(project, "a.md", digest_of("hello"))

    assert result.state == "unverified"
    assert result.reason == "name too long"


def test_a_file_that_cannot_be_read_is_unverified(project, monkeypatch):
    write(project / "a.md", "hello")
    monkeypatch.setattr(toolchain, "_digest", lambda path: (_ for _ in ()).throw(OSError("EIO")))

    result = toolchain.verify_file(project, "a.md", digest_of("hello"))

    assert result.state == "unverified"
    assert result.reason == "EIO"


def test_a_file_larger_than_one_chunk_hashes_correctly(project):
    body = "x" * (toolchain.HASH_CHUNK * 2 + 7)
    write(project / "a.md", body)

    assert toolchain.verify_file(project, "a.md", digest_of(body)).state == "ok"


# --------------------------------------------------------------------------
# read_toolchain
# --------------------------------------------------------------------------


def test_a_project_with_none_of_the_files_has_no_toolchain(project):
    assert toolchain.read_toolchain(project) is None


def test_version_integration_and_options_are_read(project):
    write(
        project / ".specify" / "integration.json",
        json.dumps(
            {
                "version": "0.14.2",
                "installed_integrations": ["claude", 7],
                "integration": "claude",
                "integration_settings": {"claude": {"script": "sh"}},
            }
        ),
    )
    write(
        project / ".specify" / "init-options.json",
        json.dumps({"feature_numbering": "sequential", "ai": "claude"}),
    )

    result = toolchain.read_toolchain(project)

    assert result is not None
    assert result.speckit_version == "0.14.2"
    assert result.integration == "claude"
    assert result.integrations == ["claude"]  # the stray 7 is skipped, not rendered
    assert result.script == "sh"
    assert result.feature_numbering == "sequential"
    assert result.drift == 0


def test_the_script_flavour_is_taken_from_init_options_when_it_is_there(project):
    write(project / ".specify" / "init-options.json", json.dumps({"script": "ps"}))

    result = toolchain.read_toolchain(project)

    assert result is not None and result.script == "ps"


def test_settings_that_are_not_a_mapping_do_not_break_the_read(project):
    write(
        project / ".specify" / "integration.json",
        json.dumps({"integration": "claude", "integration_settings": ["nonsense"]}),
    )

    result = toolchain.read_toolchain(project)

    assert result is not None and result.script is None


def test_a_manifest_supplies_the_version_when_nothing_else_does(project):
    write(project / "a.md", "hello")
    write(
        project / ".specify" / "integrations" / "claude.manifest.json",
        json.dumps({"version": "0.14.2", "files": {"a.md": digest_of("hello"), "b": 7}}),
    )

    result = toolchain.read_toolchain(project)

    assert result is not None
    assert result.speckit_version == "0.14.2"
    assert [(f.path, f.state) for f in result.files] == [("a.md", "ok")]


def test_drift_counts_modified_and_missing_but_not_unverified(project, monkeypatch):
    monkeypatch.setattr(toolchain, "MAX_HASHED_BYTES", 20)
    write(project / "edited.md", "not what it was")
    write(project / "big.md", "comfortably over the twenty byte bound")
    write(
        project / ".specify" / "integrations" / "claude.manifest.json",
        json.dumps(
            {
                "files": {
                    "edited.md": digest_of("original"),
                    "gone.md": digest_of("original"),
                    "big.md": digest_of("original"),
                }
            }
        ),
    )

    result = toolchain.read_toolchain(project)

    assert result is not None
    assert {f.path: f.state for f in result.files} == {
        "big.md": "unverified",
        "edited.md": "modified",
        "gone.md": "missing",
    }
    assert result.drift == 2


def test_a_manifest_without_a_files_map_is_skipped(project):
    write(
        project / ".specify" / "integrations" / "claude.manifest.json",
        json.dumps({"version": "0.14.2", "files": "not a map"}),
    )

    result = toolchain.read_toolchain(project)

    assert result is not None and result.files == []


def test_unreadable_and_non_object_json_is_treated_as_absent(project):
    write(project / ".specify" / "integration.json", "{ not json")
    write(project / ".specify" / "init-options.json", "[1, 2, 3]")

    assert toolchain.read_toolchain(project) is None


# --------------------------------------------------------------------------
# read_workflows
# --------------------------------------------------------------------------


def test_a_project_without_workflows_declares_none(project):
    assert toolchain.read_workflows(project) == []


def test_a_workflow_is_read_with_its_steps_in_file_order(project):
    write(
        project / ".specify" / "workflows" / "speckit" / "workflow.yml", yaml.safe_dump(WORKFLOW)
    )

    (workflow,) = toolchain.read_workflows(project)

    assert workflow.id == "speckit"
    assert workflow.name == "Full SDD Cycle"
    assert workflow.version == "1.0.0"
    assert [s.kind for s in workflow.steps] == ["command", "gate"]
    assert workflow.steps[0].command == "speckit.specify"
    assert workflow.steps[1].on_reject == "abort"
    assert workflow.error is None


def test_the_registry_supplies_source_and_the_file_wins_on_everything_else(project):
    write(
        project / ".specify" / "workflows" / "speckit" / "workflow.yml", yaml.safe_dump(WORKFLOW)
    )
    write(
        project / ".specify" / "workflows" / "workflow-registry.json",
        json.dumps(
            {
                "workflows": {
                    "speckit": {"name": "Stale name", "version": "0.0.1", "source": "bundled"}
                }
            }
        ),
    )

    (workflow,) = toolchain.read_workflows(project)

    assert workflow.source == "bundled"
    assert workflow.name == "Full SDD Cycle"  # the file is what would actually run
    assert workflow.version == "1.0.0"


def test_the_registry_fills_gaps_the_file_leaves(project):
    write(
        project / ".specify" / "workflows" / "speckit" / "workflow.yml",
        yaml.safe_dump({"steps": [{"id": "a", "command": "speckit.specify"}]}),
    )
    write(
        project / ".specify" / "workflows" / "workflow-registry.json",
        json.dumps({"workflows": {"speckit": {"name": "From registry", "version": "1.0.0"}}}),
    )

    (workflow,) = toolchain.read_workflows(project)

    assert workflow.name == "From registry"
    assert workflow.version == "1.0.0"


def test_a_registry_entry_with_no_file_is_still_listed(project):
    write(
        project / ".specify" / "workflows" / "workflow-registry.json",
        json.dumps({"workflows": {"ghost": {"name": "Ghost"}, "junk": "not a mapping"}}),
    )

    (workflow,) = toolchain.read_workflows(project)

    assert workflow.id == "ghost"
    assert workflow.steps == []
    assert workflow.error == "listed in the registry but no workflow.yml on disk"


def test_a_workflow_that_is_not_valid_yaml_is_skipped_with_a_reason(project):
    write(project / ".specify" / "workflows" / "broken" / "workflow.yml", "steps: [\n  - :\n:::")

    (workflow,) = toolchain.read_workflows(project)

    assert workflow.id == "broken"
    assert workflow.error is not None and workflow.error.startswith("unreadable:")
    assert "\n" not in workflow.error


def test_yaml_that_is_valid_but_is_not_a_workflow_document_is_skipped(project):
    write(project / ".specify" / "workflows" / "listy" / "workflow.yml", "- one\n- two\n")

    (workflow,) = toolchain.read_workflows(project)

    assert workflow.error == "not a workflow document"


def test_a_workflow_declaring_no_steps_is_not_rendered_as_having_zero(project):
    write(
        project / ".specify" / "workflows" / "empty" / "workflow.yml",
        yaml.safe_dump({"workflow": {"id": "empty", "name": "Empty"}, "steps": []}),
    )

    (workflow,) = toolchain.read_workflows(project)

    assert workflow.name == "Empty"
    assert workflow.error == "declares no steps"


def test_steps_that_are_neither_a_gate_nor_a_command_are_dropped(project):
    write(
        project / ".specify" / "workflows" / "odd" / "workflow.yml",
        yaml.safe_dump(
            {
                "steps": [
                    "a bare string",
                    {"id": "no-command", "note": "nothing to run"},
                    {"command": "speckit.plan"},
                ]
            }
        ),
    )

    (workflow,) = toolchain.read_workflows(project)

    assert [(s.id, s.kind) for s in workflow.steps] == [("step-3", "command")]


def test_a_file_that_is_not_a_directory_entry_is_ignored(project):
    (project / ".specify" / "workflows").mkdir()
    write(project / ".specify" / "workflows" / "stray.txt", "hello")
    (project / ".specify" / "workflows" / "no-yml").mkdir()

    assert toolchain.read_workflows(project) == []


def test_a_registry_that_is_not_readable_leaves_the_files_intact(project):
    write(
        project / ".specify" / "workflows" / "speckit" / "workflow.yml", yaml.safe_dump(WORKFLOW)
    )
    write(project / ".specify" / "workflows" / "workflow-registry.json", "{ not json")

    (workflow,) = toolchain.read_workflows(project)

    assert workflow.id == "speckit"
    assert workflow.source is None

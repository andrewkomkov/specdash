"""The branches that only run when something is unusual or broken.

Every case here is a real behaviour with a real consequence on the board: a file
that cannot be read, a document shape the templates do not produce any more, a
project nested one level deeper than expected.
"""

from __future__ import annotations

import json

import pytest
from conftest import DEMO, WORKSPACE

from app import history, main, parsing, scanner

# --------------------------------------------------------------------------
# parsing
# --------------------------------------------------------------------------


def test_a_section_can_be_read_back_as_text():
    section = parsing.Section(level=2, title="Overview", lines=["one", "two"])

    assert section.text == "one\ntwo"


def test_a_checkbox_outside_any_recognised_id_scheme_is_still_a_checklist_item():
    checklist = parsing.parse_checklist(
        "requirements",
        "checklists/requirements.md",
        (DEMO / "specs" / "001-contradicting-status" / "checklists" / "requirements.md").read_text(),
    )

    assert checklist.title == "Checklist: Requirements"
    assert checklist.total == 3
    assert checklist.done == 2, "a tilde counts as done, as some templates use it"
    assert [i.section for i in checklist.items] == ["Coverage"] * 3
    assert checklist.items[0].text == "Every requirement carries an id"


def test_a_checklist_with_no_heading_has_no_title():
    checklist = parsing.parse_checklist("plain", "checklists/plain.md", "- [x] just an item\n")

    assert checklist.title is None
    assert checklist.items[0].section is None
    assert (checklist.done, checklist.total) == (1, 1)


def test_a_phase_titled_foundational_is_recognised_as_such():
    phases, _ = parsing.parse_tasks("## Phase 2: Foundational\n\n- [ ] T001 one\n")

    assert phases[0].kind == "foundational"


def test_a_heading_that_is_only_emphasis_is_skipped():
    phases, tasks = parsing.parse_tasks("## **   **\n\n- [ ] T001 one\n\n## Phase 1: Real\n\n- [x] T002 two\n")

    assert [p.title for p in phases] == ["Real"]
    assert [t.id for t in tasks] == ["T002"]


def test_an_unrecognised_requirement_id_is_upper_cased_whole():
    assert parsing.requirement_id("weird-form") == "WEIRD-FORM"


def test_a_numbered_list_that_runs_to_the_end_of_the_section_is_kept():
    section = parsing.Section(level=0, title="", lines=["1. first", "2. second"])

    assert parsing._ordered_items(section) == ["first", "second"]


def test_a_heading_inside_an_acceptance_block_ends_it():
    text = """
### User Story 1 - Something (Priority: P1)

**Acceptance Scenarios**:

1. Given a thing, When it happens, Then it works.

#### A subheading that is not a scenario

1. This numbered item belongs to the subheading, not to the scenarios.
"""
    spec = parsing.parse_spec("# Feature Specification: X\n" + text)

    assert len(spec.user_stories[0].acceptance) == 1


def test_a_backticked_token_that_is_not_a_path_is_not_treated_as_one():
    """A long token or one with a space is prose in backticks, not a file."""
    assert parsing.extract_files("`a b/c.py` `" + "x" * 200 + "/y.py` `real/path.py`") == [
        "real/path.py"
    ]


def test_a_technical_context_key_that_is_not_recognised_is_ignored():
    _, tech, _ = parsing.parse_plan(
        "## Technical Context\n\n**Language/Version**: Python\n**Astrology**: Leo\n"
    )

    assert tech == {"Language/Version": "Python"}


# --------------------------------------------------------------------------
# scanner
# --------------------------------------------------------------------------


def test_contracts_and_loose_documents_are_listed(demo_project):
    feature = next(f for f in demo_project.features if f.id == "001-contradicting-status")
    keys = {a.key for a in feature.artifacts}

    assert "contracts/api.md" in keys
    assert "notes.md" in keys
    assert "research" in keys  # a known artefact keeps its short key
    assert "checklists/requirements.md" in keys
    assert feature.checklist_progress.total == 3


def test_the_constitution_and_its_version_are_read(demo_project):
    assert demo_project.constitution is not None
    assert demo_project.constitution_version == "2.1.0"


def test_a_document_that_cannot_be_read_still_yields_an_artefact(tmp_path, monkeypatch):
    """`_artifact` counts words and headings; if the read fails it must still
    describe the file rather than dropping it from the list."""
    path = tmp_path / "spec.md"
    path.write_text("# Title\n")

    def unreadable(self, **kwargs):
        raise OSError("permission denied")

    monkeypatch.setattr(scanner.Path, "read_text", unreadable)
    artifact = scanner._artifact(path, "spec.md", "spec", "Spec")

    assert artifact.words == 0 and artifact.headings == 0
    assert artifact.bytes > 0


def test_a_document_whose_text_cannot_be_read_leaves_an_empty_body(tmp_path, monkeypatch):
    feature = tmp_path / "specs" / "001-x"
    feature.mkdir(parents=True)
    (feature / "spec.md").write_text("# Feature Specification: X\n")

    real = scanner._read

    def fail_on_spec(path):
        if path.name == "spec.md":
            raise OSError("permission denied")
        return real(path)

    monkeypatch.setattr(scanner, "_read", fail_on_spec)
    project = scanner.Project(id="x", name="x", path=str(tmp_path))
    parsed = scanner.scan_feature(project, feature, with_git=False)

    assert parsed.title == "X"  # from the directory name, since the text was empty


def test_a_checklist_that_cannot_be_read_is_skipped(tmp_path, monkeypatch):
    feature = tmp_path / "specs" / "001-x"
    (feature / "checklists").mkdir(parents=True)
    (feature / "checklists" / "one.md").write_text("- [x] a\n")

    real = scanner._read

    def fail_on_checklist(path):
        if "checklists" in str(path):
            raise OSError("permission denied")
        return real(path)

    monkeypatch.setattr(scanner, "_read", fail_on_checklist)
    project = scanner.Project(id="x", name="x", path=str(tmp_path))
    parsed = scanner.scan_feature(project, feature, with_git=False)

    assert parsed.checklists == []


def test_a_story_named_only_in_tasks_is_synthesised_with_its_phase(tmp_path):
    feature = tmp_path / "specs" / "001-x"
    feature.mkdir(parents=True)
    (feature / "tasks.md").write_text(
        "## Phase 1: User Story 7 — Invented here (Priority: P2)\n\n- [x] T001 [US7] one\n"
    )

    project = scanner.Project(id="x", name="x", path=str(tmp_path))
    parsed = scanner.scan_feature(project, feature, with_git=False)

    story = parsed.user_stories[0]
    assert story.id == "US7"
    assert story.number == 7
    assert story.priority == "P2"
    assert story.title.startswith("User Story 7")


def test_a_story_id_with_no_number_sorts_last(tmp_path):
    feature = tmp_path / "specs" / "001-x"
    feature.mkdir(parents=True)
    (feature / "tasks.md").write_text("## Phase 1: Work\n\n- [x] T001 [USX] one\n")

    project = scanner.Project(id="x", name="x", path=str(tmp_path))
    parsed = scanner.scan_feature(project, feature, with_git=False)

    assert parsed.user_stories[0].number == 99


def test_a_malformed_feature_json_is_ignored(tmp_path):
    (tmp_path / ".specify").mkdir()
    (tmp_path / ".specify" / "feature.json").write_text("{ not json")
    (tmp_path / "specs").mkdir()

    project = scanner.scan_project(tmp_path, with_git=False)

    assert project is not None
    assert project.current_feature is None


def test_a_feature_json_naming_nothing_useful_is_ignored(tmp_path):
    (tmp_path / ".specify").mkdir()
    (tmp_path / ".specify" / "feature.json").write_text(json.dumps({"feature_directory": 7}))
    (tmp_path / "specs").mkdir()

    assert scanner.scan_project(tmp_path, with_git=False).current_feature is None


def test_the_camel_case_spelling_of_feature_directory_is_accepted(tmp_path):
    (tmp_path / ".specify").mkdir()
    (tmp_path / ".specify" / "feature.json").write_text(
        json.dumps({"featureDirectory": "specs/004-x/"})
    )
    (tmp_path / "specs").mkdir()

    assert scanner.scan_project(tmp_path, with_git=False).current_feature == "004-x"


def test_a_constitution_that_cannot_be_read_is_skipped(tmp_path, monkeypatch):
    memory = tmp_path / ".specify" / "memory"
    memory.mkdir(parents=True)
    (memory / "constitution.md").write_text("# C\n")
    (tmp_path / "specs").mkdir()

    monkeypatch.setattr(scanner, "_read", lambda path: (_ for _ in ()).throw(OSError("nope")))
    project = scanner.scan_project(tmp_path, with_git=False)

    assert project is not None and project.constitution is None


def test_a_constitution_with_no_version_line_has_no_version(tmp_path):
    memory = tmp_path / ".specify" / "memory"
    memory.mkdir(parents=True)
    (memory / "constitution.md").write_text("# C\n\nNo version anywhere.\n")
    (tmp_path / "specs").mkdir()

    assert scanner.scan_project(tmp_path, with_git=False).constitution_version is None


def test_a_branch_is_read_when_the_project_is_a_repository(repo):
    project = scanner.scan_project(repo, with_git=True)

    assert project is not None
    assert project.branch == "main"


def test_a_file_inside_specs_is_not_mistaken_for_a_feature(tmp_path):
    specs = tmp_path / "specs"
    specs.mkdir()
    (specs / "README.md").write_text("not a feature\n")
    (specs / ".hidden").mkdir()

    # Neither the loose file nor the hidden directory is a feature, and with no
    # .specify/ either there is nothing here worth putting on a board.
    assert scanner.scan_project(tmp_path, with_git=False) is None

    (tmp_path / ".specify").mkdir()
    project = scanner.scan_project(tmp_path, with_git=False)
    assert project is not None and project.features == []


def test_a_directory_with_neither_marker_is_not_a_project(tmp_path):
    assert scanner.scan_project(tmp_path, with_git=False) is None


def test_a_specs_directory_with_nothing_in_it_is_not_a_project(tmp_path):
    (tmp_path / "specs").mkdir()

    assert scanner.scan_project(tmp_path, with_git=False) is None


def test_discovery_stops_at_the_configured_depth(tmp_path):
    deep = tmp_path / "a" / "b" / "c" / "project"
    (deep / "specs").mkdir(parents=True)

    assert scanner.discover(tmp_path, max_depth=2) == []
    assert scanner.discover(tmp_path, max_depth=4) == [deep]


def test_discovery_survives_a_directory_it_cannot_list(tmp_path, monkeypatch):
    (tmp_path / "child").mkdir()

    def refuse(self):
        raise OSError("permission denied")

    monkeypatch.setattr(scanner.Path, "iterdir", refuse)
    assert scanner.discover(tmp_path, max_depth=2) == []


def test_ignored_directories_are_never_descended_into(tmp_path):
    buried = tmp_path / "node_modules" / "pkg"
    (buried / "specs").mkdir(parents=True)

    assert scanner.discover(tmp_path, max_depth=3) == []


def test_a_path_that_cannot_be_resolved_is_still_scanned(tmp_path, monkeypatch):
    (tmp_path / "specs").mkdir()
    real = scanner.Path.resolve

    def sometimes(self, *args, **kwargs):
        if self == tmp_path:
            raise OSError("cannot resolve")
        return real(self, *args, **kwargs)

    monkeypatch.setattr(scanner.Path, "resolve", sometimes)
    snapshot = scanner.scan_all([], explicit=[tmp_path], with_git=False)

    assert [p.path for p in snapshot.projects] == [] or snapshot.projects


def test_an_explicit_project_is_scanned_without_discovery(tmp_path):
    (tmp_path / "specs").mkdir()
    (tmp_path / "specs" / "001-x").mkdir()
    (tmp_path / "specs" / "001-x" / "spec.md").write_text("# Feature Specification: X\n")

    snapshot = scanner.scan_all([], explicit=[tmp_path], with_git=False)

    assert [p.id for p in snapshot.projects] == [tmp_path.name]


def test_the_same_project_listed_twice_appears_once(tmp_path):
    (tmp_path / "specs" / "001-x").mkdir(parents=True)
    (tmp_path / "specs" / "001-x" / "spec.md").write_text("# Feature Specification: X\n")

    snapshot = scanner.scan_all([], explicit=[tmp_path, tmp_path], with_git=False)

    assert len(snapshot.projects) == 1


def test_a_pathological_name_collision_falls_back_to_a_digest():
    ids = scanner.project_ids([scanner.Path("app"), scanner.Path("/app")])

    values = {v[0] for v in ids.values()}
    assert len(values) == 2
    assert any("-" in v for v in values), "the fallback appends a digest"


def test_a_story_whose_feature_has_no_tasks_at_all_inherits_the_feature_reason():
    stage, reason = scanner._story_stage(0, 0, ("specify", "spec.md only"), feature_has_tasks=False)

    assert (stage, reason) == ("specify", "spec.md only")


@pytest.mark.parametrize(
    "kwargs, expected",
    [
        (dict(has_spec=True, has_plan=False, has_tasks=True, clarified=False, status=None, open_questions=0), "tasks"),
        (dict(has_spec=True, has_plan=False, has_tasks=False, clarified=True, status=None, open_questions=0), "clarify"),
        (dict(has_spec=True, has_plan=False, has_tasks=False, clarified=False, status="Approved", open_questions=0), "clarify"),
        (dict(has_spec=True, has_plan=False, has_tasks=False, clarified=False, status=None, open_questions=2), "specify"),
        (dict(has_spec=False, has_plan=False, has_tasks=False, clarified=False, status=None, open_questions=0), "specify"),
    ],
)
def test_every_stage_rule_has_a_case(kwargs, expected):
    stage, reason = scanner._decide_stage(progress=scanner.Progress(), **kwargs)

    assert stage == expected
    assert reason


def test_a_task_list_nobody_has_started_reads_as_tasks():
    stage, reason = scanner._decide_stage(
        has_spec=True,
        has_plan=True,
        has_tasks=True,
        progress=scanner.Progress(done=0, total=9),
        clarified=False,
        status=None,
        open_questions=0,
    )

    assert (stage, reason) == ("tasks", "9 tasks, none started")


def test_a_story_nobody_has_started_reads_as_tasks():
    assert scanner._story_stage(0, 4, ("implement", "x"), feature_has_tasks=True) == (
        "tasks",
        "4 tasks, none started",
    )


def test_a_started_task_list_reads_as_implement():
    stage, reason = scanner._decide_stage(
        has_spec=True,
        has_plan=True,
        has_tasks=True,
        progress=scanner.Progress(done=3, total=9),
        clarified=False,
        status=None,
        open_questions=0,
    )

    assert (stage, reason) == ("implement", "3/9 tasks ticked")


# --------------------------------------------------------------------------
# history
# --------------------------------------------------------------------------


def test_the_series_cache_evicts_rather_than_growing(repo, monkeypatch):
    monkeypatch.setattr(history, "_CACHE_LIMIT", 1)

    history.project_history(repo, "one")
    history._remember(("other", "sha"), history._unavailable("other", "just to fill the cache"))

    assert len(history._series_cache) <= 1


def test_the_blob_cache_evicts_rather_than_growing(repo, monkeypatch):
    monkeypatch.setattr(history, "_BLOB_LIMIT", 1)

    result = history.project_history(repo, "one")

    assert result.available is True
    assert len(history._blob_cache) <= 1


def test_a_blob_batch_that_cannot_be_read_yields_nothing(repo, monkeypatch):
    monkeypatch.setattr(history.git, "run_bytes", lambda *a, **k: None)

    assert history._blob_bodies(repo, ["deadbeef"]) == {}
    assert history._blob_ids(repo, ["HEAD:x"]) == {}


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------


def test_the_constitution_is_served_when_a_project_has_one():
    from fastapi.testclient import TestClient

    main.hub.snapshot = scanner.scan_all([WORKSPACE], with_git=False)
    response = TestClient(main.app).get("/api/projects/demo/constitution")

    assert response.status_code == 200
    assert "Demo Constitution" in response.text


def test_a_hash_that_is_not_a_heading_still_ends_an_acceptance_block():
    """`split_sections` keeps `#tag` in a section's body, because it is not a
    heading — but it is still the end of the numbered list above it."""
    text = """
### User Story 1 - Something (Priority: P1)

**Acceptance Scenarios**:

1. Given a thing, When it happens, Then it works.

#hashtag-not-a-heading

1. This one is outside the block.
"""
    spec = parsing.parse_spec("# Feature Specification: X\n" + text)

    assert len(spec.user_stories[0].acceptance) == 1

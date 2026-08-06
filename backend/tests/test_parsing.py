"""Parser tests over the drift found in real spec-kit output.

Every case here comes from `research.md`: these are the shapes that were found in
eighteen real features and that a naive reader gets wrong. A regression in any of
them shows up on the board as a wrong number, which is worse than a crash.
"""

from __future__ import annotations

from app import parsing
from conftest import read


# --------------------------------------------------------------------------
# tasks.md
# --------------------------------------------------------------------------


def test_checkboxes_outside_task_sections_are_not_counted():
    """Format / Prerequisites / Dependencies / Notes carry checkboxes that are
    documentation. Counting them inflates the total enough to make a finished
    feature look unfinished."""
    _, tasks = parsing.parse_tasks(read("tasks-drift.md"))

    ids = [t.id for t in tasks]
    assert ids == ["T001", "T002", "T010", "T011", "T012", "T013", "T014a"]
    assert sum(1 for t in tasks if t.done) == 4


def test_phase_heading_carries_story_and_priority():
    """`## Phase 3: User Story 4 — ... (Priority: P3, built first)` names the
    phase, the story and the priority in one line, em dash included."""
    phases, tasks = parsing.parse_tasks(read("tasks-drift.md"))

    story_phase = next(p for p in phases if p.story == "US4")
    assert story_phase.index == 3
    assert story_phase.priority == "P3"
    assert story_phase.kind == "story"
    assert story_phase.goal == "Every card explains itself."
    assert story_phase.title.startswith("User Story 4")

    # The phase's story is inherited by its tasks unless a task overrides it.
    assert next(t for t in tasks if t.id == "T010").story == "US4"
    assert next(t for t in tasks if t.id == "T012").story == "US2"


def test_parallel_marker_and_referenced_files():
    _, tasks = parsing.parse_tasks(read("tasks-drift.md"))

    t002 = next(t for t in tasks if t.id == "T002")
    assert t002.parallel is True
    assert t002.files == ["backend/requirements.txt"]
    # The tag is consumed, not left in the description.
    assert not t002.description.startswith("[P]")
    assert next(t for t in tasks if t.id == "T001").parallel is False


def test_task_ids_may_carry_a_letter_suffix():
    _, tasks = parsing.parse_tasks(read("tasks-drift.md"))

    assert next(t for t in tasks if t.id == "T014a").done is True


def test_a_file_with_no_ids_at_all_still_counts_its_checkboxes():
    """Task ids are near-universal but not guaranteed. A hand-written list must
    not read as a feature with no work in it."""
    phases, tasks = parsing.parse_tasks(read("tasks-no-ids.md"))

    assert len(tasks) == 5
    assert sum(1 for t in tasks if t.done) == 3
    assert [p.title for p in phases] == ["Setup", "Build it"]
    assert [(p.done, p.total) for p in phases] == [(2, 2), (1, 3)]


def test_the_fallback_is_used_only_when_no_ids_exist():
    """The drift fixture has ids, so its unticked non-task checkboxes stay out
    of the count even though the fallback path exists."""
    _, tasks = parsing.parse_tasks(read("tasks-drift.md"))

    assert all(t.id.startswith("T") for t in tasks)


# --------------------------------------------------------------------------
# spec.md
# --------------------------------------------------------------------------


def test_wrapped_values_are_folded_rather_than_truncated():
    """`**Input**:` wraps onto the next physical line in most real specs."""
    spec = parsing.parse_spec(read("spec-drift.md"))

    assert spec.status == "Clarified — ready for planning"
    assert spec.branch == "007-drift"
    assert spec.input is not None
    assert spec.input.endswith("do not touch my files while you do it\"")


def test_requirement_ids_keep_their_letter_suffix():
    """`SC-005a` sits next to `SC-005` and must not be collapsed into it."""
    spec = parsing.parse_spec(read("spec-drift.md"))

    ids = [r.id for r in spec.success_criteria]
    assert "SC-005" in ids and "SC-005a" in ids
    assert len(ids) == len(set(ids))

    suffixed = next(r for r in spec.success_criteria if r.id == "SC-005a")
    assert "four hundred" in suffixed.text  # the wrapped remainder survived


def test_requirements_nested_under_a_parent_section_are_counted_once():
    """`## Requirements` and its own `### Functional Requirements` subsection both
    match the section scan, so the same bullet is reached twice."""
    spec = parsing.parse_spec(read("spec-drift.md"))

    ids = [r.id for r in spec.requirements]
    assert ids == ["FR-001", "FR-002"]

    first = spec.requirements[0]
    assert first.text.endswith("that will be forgotten.")  # folded, not truncated


def test_user_stories_carry_priority_and_acceptance_scenarios():
    spec = parsing.parse_spec(read("spec-drift.md"))

    assert [s.id for s in spec.user_stories] == ["US1", "US4"]
    first, fourth = spec.user_stories
    assert first.priority == "P1"
    assert fourth.priority == "P3"  # heading uses an em dash rather than a hyphen
    assert len(first.acceptance) == 2
    assert first.acceptance[0].text.startswith("Given two projects under the root")
    assert first.why is not None and first.why.startswith("Without the board")
    assert first.independent_test is not None


def test_open_questions_and_clarifications():
    spec = parsing.parse_spec(read("spec-drift.md"))

    assert spec.open_questions == ["does an export button count as editing?"]
    assert any("Read-only is structural" in c for c in spec.clarifications)
    assert len(spec.edge_cases) == 2


# --------------------------------------------------------------------------
# plan.md
# --------------------------------------------------------------------------


def test_technical_context_folds_wrapped_values_and_drops_open_questions():
    summary, tech = parsing.parse_plan(read("plan-drift.md"))

    assert summary is not None and summary.startswith("One container")
    assert tech["Storage"].endswith("rebuilt on every scan and never persisted")
    assert tech["Primary Dependencies"].endswith("Vite 7")
    # A value that is still a question is not a fact worth showing.
    assert "Target Platform" not in tech

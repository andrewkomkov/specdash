"""Parser tests over the drift found in real spec-kit output.

Every case here comes from `research.md`: these are the shapes that were found in
eighteen real features and that a naive reader gets wrong. A regression in any of
them shows up on the board as a wrong number, which is worse than a crash.
"""

from __future__ import annotations

from conftest import read

from app import parsing

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
    summary, tech, _ = parsing.parse_plan(read("plan-drift.md"))

    assert summary is not None and summary.startswith("One container")
    assert tech["Storage"].endswith("rebuilt on every scan and never persisted")
    assert tech["Primary Dependencies"].endswith("Vite 7")
    # A value that is still a question is not a fact worth showing.
    assert "Target Platform" not in tech


# --------------------------------------------------------------------------
# plan.md — the constitution gate and the exceptions it declares
# --------------------------------------------------------------------------


CONSTITUTION_FAIL = """\
## Constitution Check

- [x] I. Read-only holds
- [ ] V. Live — this feature adds a manual refresh step

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| A second scan pass | the gate needs resolved stages | one pass cannot see its own output |
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
"""


def test_a_plan_with_no_constitution_section_reports_nothing_rather_than_unknown():
    """An absent section and an unresolved one are different facts."""
    _, _, constitution = parsing.parse_plan("## Summary\n\nA thing.\n")

    assert constitution is None


def test_an_untouched_template_section_is_unknown_and_never_a_pass():
    _, _, constitution = parsing.parse_plan(
        "## Constitution Check\n\n"
        "*GATE: Must pass before Phase 0 research.*\n\n"
        "[Gates determined based on constitution file]\n"
    )

    assert constitution is not None
    assert constitution.verdict == "unknown"
    assert constitution.evidence is None
    assert constitution.rows == []


def test_an_unticked_gate_fails_and_carries_the_line_it_failed_on():
    _, _, constitution = parsing.parse_plan(CONSTITUTION_FAIL)

    assert constitution is not None
    assert constitution.verdict == "fail"
    assert constitution.evidence == "V. Live — this feature adds a manual refresh step"


def test_declared_complexity_is_read_and_the_template_row_is_not():
    _, _, constitution = parsing.parse_plan(CONSTITUTION_FAIL)

    assert constitution is not None
    assert len(constitution.rows) == 1
    row = constitution.rows[0]
    assert row.violation == "A second scan pass"
    assert row.why_needed == "the gate needs resolved stages"
    assert row.alternative == "one pass cannot see its own output"


def test_the_word_fail_in_prose_fails_the_gate_but_lower_case_prose_does_not():
    _, _, failed = parsing.parse_plan("## Constitution Check\n\nFAIL: writes a cache file.\n")
    _, _, passed = parsing.parse_plan(
        "## Constitution Check\n\nPASS. Nothing here fails to hold.\n"
    )

    assert failed is not None and failed.verdict == "fail"
    assert failed.evidence == "FAIL: writes a cache file."
    assert passed is not None and passed.verdict == "pass"
    assert passed.evidence == "PASS. Nothing here fails to hold."


def test_an_all_ticked_gate_list_passes_and_says_how_it_knows():
    _, _, constitution = parsing.parse_plan(
        "## Constitution Check\n\n- [x] I. Read-only\n- [x] II. Files are the truth\n"
    )

    assert constitution is not None
    assert constitution.verdict == "pass"
    assert constitution.evidence == "2 gate(s) ticked"


def test_a_complexity_table_that_is_only_placeholders_declares_nothing():
    _, _, constitution = parsing.parse_plan(
        "## Constitution Check\n\nPASS\n\n"
        "## Complexity Tracking\n\n"
        "| Violation | Why Needed |\n|---|---|\n| [e.g., a thing] | [current need] |\n"
        "not a table row at all\n"
        "|  | a justification with nothing to justify |\n"
    )

    assert constitution is not None and constitution.rows == []


def test_a_complexity_row_with_only_a_violation_keeps_its_empty_columns_empty():
    _, _, constitution = parsing.parse_plan(
        "## Constitution Check\n\nFAIL\n\n## Complexity Tracking\n\n| A second pass |\n"
    )

    assert constitution is not None
    assert constitution.rows[0].violation == "A second pass"
    assert constitution.rows[0].why_needed is None
    assert constitution.rows[0].alternative is None


# --------------------------------------------------------------------------
# spec.md — the sections the parser used to drop
# --------------------------------------------------------------------------


def test_key_entities_assumptions_and_dependencies_are_read():
    spec = parsing.parse_spec(
        "## Requirements\n\n### Key Entities\n\n"
        "- **Finding**: one observed disagreement: named on both sides\n"
        "- **[Entity 2]**: [What it represents]\n\n"
        "## Assumptions\n\n- Digests are SHA-256\n- [placeholder assumption]\n\n"
        "## Dependencies\n\n- A YAML parser\n"
    )

    assert [(e.name, e.text) for e in spec.entities] == [
        ("Finding", "one observed disagreement: named on both sides")
    ]
    assert spec.assumptions == ["Digests are SHA-256"]
    assert spec.dependencies == ["A YAML parser"]


def test_a_spec_without_those_sections_gets_empty_ones_rather_than_invented_content():
    spec = parsing.parse_spec("# Feature Specification: Bare\n\n**Status**: Draft\n")

    assert spec.entities == []
    assert spec.assumptions == []
    assert spec.dependencies == []


def test_an_id_declared_twice_in_one_section_is_recorded_as_a_duplicate():
    spec = parsing.parse_spec(
        "### Functional Requirements\n\n"
        "- **FR-001**: one\n- **FR-002**: two\n- **FR-001**: one again\n"
    )

    assert spec.duplicate_requirements == ["FR-001"]
    assert [r.id for r in spec.requirements] == ["FR-001", "FR-002"]


def test_the_parser_seeing_one_bullet_through_two_headings_is_not_a_duplicate():
    """`## Requirements` and its own `### Functional Requirements` subsection
    both reach the same bullet. That is the parser, not the document."""
    spec = parsing.parse_spec(
        "## Requirements\n\n### Functional Requirements\n\n- **FR-001**: one\n"
    )

    assert spec.duplicate_requirements == []


def test_a_clarification_marker_inside_code_formatting_is_a_mention_not_a_question():
    """A spec explaining the marker would otherwise report itself as unclear —
    and, because open questions place a feature, be held in Specify by its own
    prose."""
    spec = parsing.parse_spec(
        "## Overview\n\n"
        "A `[NEEDS CLARIFICATION]` marker means the spec is not settled.\n\n"
        "```text\n[NEEDS CLARIFICATION: an example inside a fence]\n```\n\n"
        "- [NEEDS CLARIFICATION: which auth provider?]\n"
    )

    assert spec.open_questions == ["which auth provider?"]


def test_a_wrapped_task_keeps_the_rest_of_its_sentence():
    """Reading only the first physical line truncated tasks mid-sentence: the
    drawer showed half a task, search never saw the remainder, and the
    traceability rule was reading half of what it checked."""
    _, tasks = parsing.parse_tasks(
        "## Phase 1: Setup\n\n"
        "- [x] T001 Add the models to `backend/app/models.py`, including\n"
        "      `Finding` and `Toolchain` (FR-002)\n"
        "- [ ] T002 A task that does not wrap\n"
    )

    first, second = tasks
    assert first.description.endswith("Finding and Toolchain (FR-002)")
    assert first.files == ["backend/app/models.py"]
    assert second.description == "A task that does not wrap"


def test_folding_stops_at_anything_that_is_not_a_continuation():
    _, tasks = parsing.parse_tasks(
        "## Phase 1: Setup\n\n"
        "- [x] T001 Stops at a blank line\n\n"
        "      not a continuation\n"
        "- [x] T002 Stops at a nested bullet\n"
        "      - a sub-point\n"
        "- [x] T003 Stops at an unindented line\n"
        "next paragraph\n"
    )

    assert [t.description for t in tasks] == [
        "Stops at a blank line",
        "Stops at a nested bullet",
        "Stops at an unindented line",
    ]


def test_a_gate_written_as_a_table_row_loses_its_pipes():
    """A raw row carried `| I. Read-only | … | PASS |` into the drawer."""
    _, _, constitution = parsing.parse_plan(
        "## Constitution Check\n\n"
        "| Principle | Reasoning | Verdict |\n|---|---|---|\n"
        "| I. Read-only is the law | nothing here opens a file for writing | PASS |\n"
    )

    assert constitution is not None
    assert constitution.verdict == "pass"
    assert "|" not in (constitution.evidence or "")
    assert constitution.evidence is not None
    assert constitution.evidence.startswith("I. Read-only is the law · nothing here")

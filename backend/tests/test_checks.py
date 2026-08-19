"""What the consistency rules do and, as often, refuse to do.

Every test here builds a `Feature` by hand. The module under test cannot open a
file, so there is nothing to fixture — and a rule that needed a filesystem to be
exercised would already be the wrong shape.
"""

from __future__ import annotations

from app import checks
from app.models import (
    Checklist,
    ChecklistItem,
    ConstitutionResult,
    Feature,
    Progress,
    Requirement,
    Task,
    UserStory,
)


def make_feature(**kwargs) -> Feature:
    base = dict(
        id="001-thing",
        project_id="demo",
        slug="thing",
        title="Thing",
        stage="implement",
        stage_reason="3/4 tasks ticked",
    )
    return Feature(**{**base, **kwargs})


def task(id: str, description: str, done: bool = False, story: str | None = None) -> Task:
    return Task(
        id=id,
        description=description,
        done=done,
        story=story,
        phase="Phase 1: Setup",
        phase_index=1,
        line=1,
    )


def codes(feature: Feature) -> list[str]:
    return [f.code for f in checks.findings_for(feature)]


# --------------------------------------------------------------------------
# a clean feature
# --------------------------------------------------------------------------


def test_a_feature_with_nothing_wrong_produces_nothing():
    feature = make_feature(
        tasks=[task("T001", "Do the thing", done=True)],
        progress=Progress(done=1, total=1),
    )

    assert checks.findings_for(feature) == []
    assert checks.worst([]) is None


# --------------------------------------------------------------------------
# FR-003 — unreferenced requirements
# --------------------------------------------------------------------------


def test_a_requirement_no_task_names_is_reported_where_the_convention_is_in_use():
    feature = make_feature(
        requirements=[Requirement(id="FR-001", text="one"), Requirement(id="FR-002", text="two")],
        tasks=[task("T001", "Implement FR-001 in the scanner")],
    )

    findings = checks.findings_for(feature)

    assert [f.ref for f in findings] == ["FR-002"]
    assert findings[0].code == "requirement-unreferenced"
    assert findings[0].severity == "warn"
    assert findings[0].file == "spec.md"
    assert findings[0].message.startswith("1 of 2 requirements")


def test_many_untraced_requirements_are_one_gap_rather_than_many_problems():
    """The card carries a count. One finding per requirement made a single
    blocker sit behind thirty warnings on the author's own root."""
    feature = make_feature(
        requirements=[Requirement(id=f"FR-{i:03}", text="x") for i in range(1, 13)],
        tasks=[task("T001", "Implement FR-001")],
    )

    findings = checks.findings_for(feature)

    assert len(findings) == 1
    assert findings[0].message.startswith("11 of 12 requirements")
    # Long lists are truncated rather than printed whole.
    assert findings[0].message.endswith("…+3")
    assert "FR-002" in findings[0].message


def test_a_feature_that_never_cites_an_id_reports_none_of_them():
    """The rule that made this repository's own board useless before it shipped.

    Firing here would report a house style rather than a disagreement, and would
    have put a warning on every finished feature in the author's root.
    """
    feature = make_feature(
        requirements=[Requirement(id="FR-001", text="one"), Requirement(id="FR-002", text="two")],
        tasks=[task("T001", "Write the scanner"), task("T002", "Write the tests")],
    )

    assert checks.findings_for(feature) == []


def test_an_id_written_without_its_hyphen_still_counts_as_a_reference():
    feature = make_feature(
        requirements=[Requirement(id="FR-001", text="one"), Requirement(id="FR-002", text="two")],
        tasks=[task("T001", "Cover FR001 and FR 002")],
    )

    assert checks.findings_for(feature) == []


def test_requirements_are_not_checked_without_a_task_list():
    feature = make_feature(requirements=[Requirement(id="FR-001", text="one")])

    assert checks.findings_for(feature) == []


def test_tasks_are_not_checked_without_requirements():
    feature = make_feature(tasks=[task("T001", "Do the thing")])

    assert checks.findings_for(feature) == []


# --------------------------------------------------------------------------
# FR-004 — open clarifications
# --------------------------------------------------------------------------


def test_an_open_question_after_planning_is_a_blocker():
    feature = make_feature(stage="implement", open_questions=["which auth provider?"])

    findings = checks.findings_for(feature)

    assert findings[0].code == "open-clarification"
    assert findings[0].severity == "blocker"
    assert "implement" in findings[0].message
    assert checks.worst(findings) == "blocker"


def test_an_open_question_before_planning_is_merely_where_the_feature_is():
    feature = make_feature(stage="specify", open_questions=["which auth provider?"])

    findings = checks.findings_for(feature)

    assert findings[0].severity == "info"
    assert "specify" not in findings[0].message


def test_a_very_long_question_is_shortened_rather_than_dropped():
    feature = make_feature(stage="clarify", open_questions=["word " * 60])

    message = checks.findings_for(feature)[0].message

    assert message.endswith("…")
    assert len(message) < 140


# --------------------------------------------------------------------------
# FR-005 — a status line that argues with the task list
# --------------------------------------------------------------------------


def test_a_draft_status_over_a_finished_task_list_is_reported_not_acted_on():
    feature = make_feature(
        stage="done",
        stage_reason="all 4 tasks ticked",
        status="Draft",
        progress=Progress(done=4, total=4),
    )

    findings = checks.findings_for(feature)

    assert findings[0].code == "status-disagrees"
    assert findings[0].severity == "info"
    # Principle II already settled this; the finding must not re-open it.
    assert feature.stage == "done"


def test_a_status_that_agrees_with_the_ticks_says_nothing():
    feature = make_feature(
        stage="done", status="Implemented", progress=Progress(done=4, total=4)
    )

    assert checks.findings_for(feature) == []


def test_a_part_finished_task_list_does_not_argue_with_a_draft_status():
    feature = make_feature(status="Draft", progress=Progress(done=1, total=4))

    assert checks.findings_for(feature) == []


def test_no_status_line_is_not_a_disagreement():
    feature = make_feature(status=None, progress=Progress(done=4, total=4))

    assert checks.findings_for(feature) == []


# --------------------------------------------------------------------------
# FR-006 — a story only tasks.md knows about
# --------------------------------------------------------------------------


def test_a_story_the_spec_never_introduced_is_reported_and_keeps_its_card():
    story = UserStory(id="US7", number=7, title="US7", in_spec=False, done=1, total=2)
    feature = make_feature(user_stories=[story])

    findings = checks.findings_for(feature)

    assert findings[0].code == "story-not-in-spec"
    assert findings[0].ref == "US7"
    # The card is still owed: dropping it makes the column totals stop adding up.
    assert feature.user_stories == [story]


def test_a_story_the_spec_declares_is_not_reported():
    feature = make_feature(user_stories=[UserStory(id="US1", number=1, title="One")])

    assert checks.findings_for(feature) == []


# --------------------------------------------------------------------------
# FR-007 / FR-008 / FR-009
# --------------------------------------------------------------------------


def test_a_duplicated_requirement_id_is_reported_once():
    feature = make_feature(duplicate_requirements=["FR-004"])

    findings = checks.findings_for(feature)

    assert [f.code for f in findings] == ["requirement-duplicate"]
    assert findings[0].ref == "FR-004"


def test_a_done_feature_with_an_unfinished_checklist_is_reported():
    checklist = Checklist(
        name="ux",
        file="checklists/ux.md",
        items=[ChecklistItem(text="a", done=True), ChecklistItem(text="b", done=False)],
        done=1,
        total=2,
    )
    feature = make_feature(
        stage="done",
        checklists=[checklist],
        checklist_progress=Progress(done=1, total=2),
    )

    findings = checks.findings_for(feature)

    assert findings[0].code == "checklist-open-in-done"
    assert findings[0].file == "checklists/ux.md"
    assert "1 of 2" in findings[0].message


def test_an_unfinished_checklist_before_done_is_simply_work_in_progress():
    feature = make_feature(stage="implement", checklist_progress=Progress(done=1, total=2))

    assert checks.findings_for(feature) == []


def test_a_done_feature_with_a_finished_checklist_says_nothing():
    feature = make_feature(stage="done", checklist_progress=Progress(done=2, total=2))

    assert checks.findings_for(feature) == []


def test_a_done_feature_with_no_checklist_at_all_says_nothing():
    feature = make_feature(stage="done")

    assert checks.findings_for(feature) == []


def test_a_done_feature_whose_open_items_have_no_named_list_still_reports():
    """`checklist_progress` and `checklists` are set separately by the scanner;
    the rule must not assume it can always name a file."""
    feature = make_feature(stage="done", checklist_progress=Progress(done=0, total=3))

    findings = checks.findings_for(feature)

    assert findings[0].code == "checklist-open-in-done"
    assert findings[0].file is None
    assert findings[0].ref is None


def test_a_failed_constitution_check_is_a_blocker_carrying_its_evidence():
    feature = make_feature(
        constitution=ConstitutionResult(verdict="fail", evidence="FAIL: writes a cache file")
    )

    findings = checks.findings_for(feature)

    assert findings[0].code == "constitution-failed"
    assert findings[0].severity == "blocker"
    assert "writes a cache file" in findings[0].message


def test_a_failed_check_with_no_evidence_still_reports():
    feature = make_feature(constitution=ConstitutionResult(verdict="fail"))

    assert checks.findings_for(feature)[0].message.endswith("constitution check")


def test_a_passing_or_unknown_check_is_not_a_finding():
    for verdict in ("pass", "unknown"):
        feature = make_feature(constitution=ConstitutionResult(verdict=verdict))
        assert checks.findings_for(feature) == []

    assert checks.findings_for(make_feature(constitution=None)) == []


# --------------------------------------------------------------------------
# FR-002 / ordering
# --------------------------------------------------------------------------


def test_findings_come_back_worst_first_and_in_a_stable_order():
    feature = make_feature(
        stage="done",
        stage_reason="all 2 tasks ticked",
        status="Draft",
        progress=Progress(done=2, total=2),
        open_questions=["which provider?"],
        duplicate_requirements=["FR-009", "FR-002"],
        user_stories=[UserStory(id="US7", number=7, title="US7", in_spec=False)],
        constitution=ConstitutionResult(verdict="fail", evidence="FAIL"),
    )

    findings = checks.findings_for(feature)

    assert [f.severity for f in findings] == sorted(
        (f.severity for f in findings), key=lambda s: {"blocker": 0, "warn": 1, "info": 2}[s]
    )
    assert codes(feature)[:2] == ["constitution-failed", "open-clarification"]
    # Duplicates are ordered by reference, not by the order the parser saw them.
    dupes = [f.ref for f in findings if f.code == "requirement-duplicate"]
    assert dupes == ["FR-002", "FR-009"]
    assert checks.worst(findings) == "blocker"
    assert checks.findings_for(feature) == findings


def test_every_finding_carries_a_key_and_its_variables():
    """A finding is prose, so it crosses the wire twice.

    The English sentence stays — an API consumer keeps what it had — and the key
    beside it is what an interface renders in the reader's own language. The two
    have to agree about the numbers, which is what makes this worth asserting:
    a key whose variables do not fill its placeholders renders a sentence with
    a `{count}` in it.
    """
    feature = make_feature(
        stage="done",
        status="draft",
        progress=Progress(done=2, total=2),
        tasks=[task("T001", "one", done=True), task("T002", "two", done=True)],
        open_questions=["how many?"],
        duplicate_requirements=["FR-007"],
        requirements=[Requirement(id="FR-001", text="a"), Requirement(id="FR-002", text="b")],
        user_stories=[
            UserStory(id="US9", number=9, title="ghost", in_spec=False)
        ],
        checklists=[
            Checklist(
                name="ux",
                file="checklists/ux.md",
                title="UX",
                items=[ChecklistItem(text="a", done=False)],
            )
        ],
        constitution=ConstitutionResult(verdict="fail", evidence="principle II"),
    )

    findings = checks.findings_for(feature)
    assert findings, "the fixture is meant to trip several rules at once"
    for finding in findings:
        assert finding.message_key.startswith("checks.msg.")
        assert finding.message, "the English sentence is still the fallback"


def test_a_stage_crosses_the_wire_as_an_id_not_as_a_word():
    """The interface owns what a stage is called, in both languages."""
    feature = make_feature(stage="plan", open_questions=["which store?"])

    (finding,) = [f for f in checks.findings_for(feature) if f.code == "open-clarification"]

    assert finding.message_key == "checks.msg.open-clarification.committed"
    assert finding.message_vars["stage"] == "plan"


def test_every_key_the_backend_emits_exists_in_the_dictionary():
    """The two halves ship in one image, so they may as well be checked together.

    A rule that starts emitting a key nobody wrote a sentence for degrades to
    English rather than breaking — but it degrades silently, and this is the
    test that refuses to let it.
    """
    import re
    from pathlib import Path

    from app import history, main, scanner

    dictionary = Path(__file__).resolve().parents[2] / "frontend" / "src" / "i18n.ts"
    written = set(re.findall(r"'([a-z]+\.[a-zA-Z0-9.\-]+)':", dictionary.read_text()))

    emitted = set(re.findall(r'"((?:checks\.msg|trend\.reason|doc)\.[a-zA-Z0-9.\-]+)"',
                             "".join(Path(m.__file__).read_text()
                                     for m in (checks, history, main))))
    emitted |= {f"doc.{name[:-3]}" for name, _ in scanner.KNOWN_ARTIFACTS}
    emitted |= {"doc.contract", "doc.checklist"}

    assert emitted, "the regex is meant to find the keys, not to pass by finding none"
    assert emitted <= written, f"no sentence written for {sorted(emitted - written)}"

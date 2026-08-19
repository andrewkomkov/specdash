"""What a feature's own artefacts disagree about.

spec-kit ships `/speckit.analyze` for this question, but its answer lands in a
chat transcript and is gone. Everything it needs is already parsed here, so the
board can answer continuously instead of when asked.

Two rules govern everything in this module, both from the constitution:

*The files are the truth* — a finding reports that two artefacts say different
things and names both. It never re-places a feature. Principle II already
decided which side wins when a status line argues with a task list; a finding
records that the argument happened.

*Tolerant, not inventive* — a finding must be derivable from what was parsed. No
rule here guesses whether a requirement is a good requirement, whether a task is
the right task, or what a document probably meant.

The module imports models and nothing else. It cannot open a file, so it cannot
write one either.
"""

from __future__ import annotations

from .models import SEVERITY_RANK, Feature, Finding, Severity

# Stages at which an unresolved question has stopped being an open question and
# started being work proceeding over one.
COMMITTED_STAGES = ("plan", "tasks", "implement", "done")

# Status lines that claim less progress than a fully ticked task list shows.
EARLY_STATUS = (
    "draft",
    "ready for planning",
    "ready to plan",
    "planning",
    "in progress",
    "in-progress",
    "wip",
)


def _shorten(text: str, limit: int = 90) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _requirement_forms(req_id: str) -> tuple[str, ...]:
    """`FR-012` is written `FR-012`, `FR012` and `FR 012` in real task lists."""
    bare = req_id.replace("-", "")
    return (req_id.lower(), bare.lower(), req_id.replace("-", " ").lower())


def _unreferenced_requirements(feature: Feature) -> list[Finding]:
    """Requirements no task mentions (FR-003).

    Guarded on the feature tracing *any* requirement from its tasks. Plenty of
    healthy features never cite ids, and firing on those would report a
    house style rather than a disagreement — which is the judgement this module
    is not allowed to make. Verified against the author's own root, where the
    unguarded rule fired on every single feature and said nothing.

    Where the convention is in use, a requirement outside it is a real gap: the
    document itself establishes that ids get traced, and this one was not.

    Reported as one finding rather than one per requirement. A feature with
    twenty-four untraced ids has one gap in its traceability, not twenty-four
    problems — and the card carries a count, so the per-requirement form made a
    single blocker sit behind thirty warnings. Measured on the author's root,
    where the per-requirement form produced 104 findings against 13 gaps.
    """
    if not feature.tasks or not feature.requirements:
        return []

    haystack = " ".join(t.description for t in feature.tasks).lower()
    missing = [
        r.id
        for r in feature.requirements
        if not any(f in haystack for f in _requirement_forms(r.id))
    ]
    if not missing or len(missing) == len(feature.requirements):
        return []

    listed = ", ".join(missing[:8])
    if len(missing) > 8:
        listed += f", …+{len(missing) - 8}"
    return [
        Finding(
            code="requirement-unreferenced",
            severity="warn",
            message=(
                f"{len(missing)} of {len(feature.requirements)} requirements are named by no "
                f"task, while others are: {listed}"
            ),
            message_key="checks.msg.requirement-unreferenced",
            message_vars={
                "missing": len(missing),
                "total": len(feature.requirements),
                "listed": listed,
            },
            ref=missing[0],
            file="spec.md",
        )
    ]


def _open_clarifications(feature: Feature) -> list[Finding]:
    """`[NEEDS CLARIFICATION]` still in the spec (FR-004).

    Before planning this is simply where the feature is. From planning onward it
    means work is being cut over a question nobody answered.
    """
    if not feature.open_questions:
        return []
    committed = feature.stage in COMMITTED_STAGES
    severity: Severity = "blocker" if committed else "info"
    message = (
        "spec.md still has an open clarification marker while the feature is at "
        f"{feature.stage}"
        if committed
        else "spec.md has an open clarification marker"
    )
    key = (
        "checks.msg.open-clarification.committed"
        if committed
        else "checks.msg.open-clarification"
    )
    return [
        Finding(
            code="open-clarification",
            severity=severity,
            message=f"{message}: {_shorten(q)}",
            message_key=key,
            message_vars={"stage": feature.stage, "question": _shorten(q)},
            ref=_shorten(q, 40),
            file="spec.md",
        )
        for q in feature.open_questions
    ]


def _status_disagrees(feature: Feature) -> list[Finding]:
    """A status line claiming less than the task list shows (FR-005).

    Reported, never acted on. The stage is already correct — Principle II put it
    there — and the card already says which evidence placed it. This finding
    exists so the *document* can be repaired, not the placement.
    """
    if not feature.status or not feature.progress.total:
        return []
    if feature.progress.done != feature.progress.total:
        return []
    low = feature.status.lower()
    if not any(word in low for word in EARLY_STATUS):
        return []
    return [
        Finding(
            code="status-disagrees",
            severity="info",
            message=(
                f'spec.md still says "{_shorten(feature.status, 40)}" over a fully ticked '
                f"tasks.md ({feature.progress.total}/{feature.progress.total})"
            ),
            message_key="checks.msg.status-disagrees",
            message_vars={
                "status": _shorten(feature.status, 40),
                "total": feature.progress.total,
            },
            file="spec.md",
        )
    ]


def _stories_not_in_spec(feature: Feature) -> list[Finding]:
    """A story tasks.md works on that spec.md never introduced (FR-006).

    The story keeps its card either way — dropping it would make the column
    totals stop adding up, which is the same reason the unassigned bucket exists.
    """
    return [
        Finding(
            code="story-not-in-spec",
            severity="warn",
            message=f"tasks.md assigns work to {s.id}, which spec.md does not define",
            message_key="checks.msg.story-not-in-spec",
            message_vars={"story": s.id},
            ref=s.id,
            file="tasks.md",
        )
        for s in feature.user_stories
        if not s.in_spec
    ]


def _duplicate_requirements(feature: Feature) -> list[Finding]:
    """The same requirement id declared twice in one section (FR-007)."""
    return [
        Finding(
            code="requirement-duplicate",
            severity="warn",
            message=f"{req_id} is declared more than once in spec.md",
            message_key="checks.msg.requirement-duplicate",
            message_vars={"id": req_id},
            ref=req_id,
            file="spec.md",
        )
        for req_id in feature.duplicate_requirements
    ]


def _checklist_open_in_done(feature: Feature) -> list[Finding]:
    """A finished feature with an unfinished checklist (FR-008)."""
    progress = feature.checklist_progress
    if feature.stage != "done" or not progress.total or progress.done == progress.total:
        return []
    open_lists = [c.file for c in feature.checklists if c.done < c.total]
    return [
        Finding(
            code="checklist-open-in-done",
            severity="warn",
            message=(
                f"every task is ticked but {progress.total - progress.done} of "
                f"{progress.total} checklist items are not"
            ),
            message_key="checks.msg.checklist-open-in-done",
            message_vars={"open": progress.total - progress.done, "total": progress.total},
            ref=", ".join(open_lists) or None,
            file=open_lists[0] if open_lists else None,
        )
    ]


def _constitution_failed(feature: Feature) -> list[Finding]:
    """A plan that records its own constitution gate as failed (FR-009)."""
    result = feature.constitution
    if result is None or result.verdict != "fail":
        return []
    return [
        Finding(
            code="constitution-failed",
            severity="blocker",
            message="plan.md records a failed constitution check"
            + (f": {_shorten(result.evidence)}" if result.evidence else ""),
            message_key=(
                "checks.msg.constitution-failed.evidence"
                if result.evidence
                else "checks.msg.constitution-failed"
            ),
            message_vars=(
                {"evidence": _shorten(result.evidence)} if result.evidence else {}
            ),
            file="plan.md",
        )
    ]


RULES = (
    _open_clarifications,
    _constitution_failed,
    _unreferenced_requirements,
    _stories_not_in_spec,
    _duplicate_requirements,
    _checklist_open_in_done,
    _status_disagrees,
)


def findings_for(feature: Feature) -> list[Finding]:
    """Every disagreement this feature's artefacts hold, worst first.

    The order is total — severity, then code, then reference — so the badge on a
    card names the same finding between two scans of an unchanged tree.
    """
    found: list[Finding] = []
    for rule in RULES:
        found.extend(rule(feature))
    found.sort(key=lambda f: (SEVERITY_RANK[f.severity], f.code, f.ref or ""))
    return found


def worst(findings: list[Finding]) -> Severity | None:
    """The severity a card should colour itself by, or None for a clean feature."""
    return findings[0].severity if findings else None

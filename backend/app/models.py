"""Domain model of a spec-kit workspace.

Everything here is derived from files on disk and is treated as read-only:
SpecDash never writes into a scanned project.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, computed_field

Stage = Literal["specify", "clarify", "plan", "tasks", "implement", "done"]

STAGES: list[Stage] = ["specify", "clarify", "plan", "tasks", "implement", "done"]

STAGE_LABELS: dict[Stage, str] = {
    "specify": "Specify",
    "clarify": "Clarify",
    "plan": "Plan",
    "tasks": "Tasks",
    "implement": "Implement",
    "done": "Done",
}


class Task(BaseModel):
    id: str  # T001
    description: str
    done: bool
    parallel: bool = False
    story: str | None = None  # US1
    phase: str  # human-readable phase title
    phase_index: int
    line: int
    files: list[str] = Field(default_factory=list)  # backtick-quoted paths in the text


class Phase(BaseModel):
    index: int
    title: str
    kind: Literal["setup", "foundational", "story", "polish", "other"] = "other"
    story: str | None = None
    priority: str | None = None
    goal: str | None = None
    purpose: str | None = None
    done: int = 0
    total: int = 0


class AcceptanceScenario(BaseModel):
    index: int
    text: str


class UserStory(BaseModel):
    id: str  # US1
    number: int
    title: str
    priority: str | None = None  # P1
    why: str | None = None
    independent_test: str | None = None
    narrative: str | None = None
    acceptance: list[AcceptanceScenario] = Field(default_factory=list)
    done: int = 0
    total: int = 0
    # False for a story only tasks.md knows about. It still gets a card — losing
    # it would make the column totals stop adding up — but the gap is reportable.
    in_spec: bool = True

    # Where this story sits on its own evidence, so the board can lay stories out
    # by stage rather than only whole features.
    stage: Stage = "specify"
    stage_reason: str = ""


class Requirement(BaseModel):
    id: str  # FR-001 / SC-001 / NFR-002
    text: str


class ChecklistItem(BaseModel):
    text: str
    done: bool
    section: str | None = None


class Checklist(BaseModel):
    name: str
    file: str
    title: str | None = None
    items: list[ChecklistItem] = Field(default_factory=list)
    done: int = 0
    total: int = 0


class Entity(BaseModel):
    """A `**Name**: description` bullet under spec.md's Key Entities."""

    name: str
    text: str


Severity = Literal["blocker", "warn", "info"]

# Worst first. A card shows one colour, so the order has to be total.
SEVERITY_RANK: dict[Severity, int] = {"blocker": 0, "warn": 1, "info": 2}


class Finding(BaseModel):
    """One observed disagreement between two artefacts.

    A finding is never a judgement about whether a document is any good — it
    records that two files on disk say different things, and names both. It is
    recomputed on every scan and stored nowhere.

    A finding is prose, unlike the scanner's evidence strings, so it crosses the
    wire twice: as English in `message`, and as the key and variables an
    interface can render in the reader's own language. `code` stays what it
    always was — the stable, machine-readable name of the rule.
    """

    code: str  # requirement-unreferenced, open-clarification, …
    severity: Severity
    message: str
    message_key: str = ""
    message_vars: dict[str, str | int] = Field(default_factory=dict)
    ref: str | None = None  # FR-012, US3, checklists/ux.md
    file: str | None = None  # relative to the feature directory


class ComplexityRow(BaseModel):
    """One deliberately declared constitutional exception from plan.md."""

    violation: str
    why_needed: str | None = None
    alternative: str | None = None


class ConstitutionResult(BaseModel):
    """plan.md's `## Constitution Check` gate, and what the verdict rests on.

    `unknown` is a real answer and the default one: an untouched template
    section must never read as a pass.
    """

    verdict: Literal["pass", "fail", "unknown"] = "unknown"
    evidence: str | None = None  # the line the verdict was drawn from
    rows: list[ComplexityRow] = Field(default_factory=list)


class ManifestFile(BaseModel):
    """A file spec-kit installed, checked against the digest it recorded."""

    path: str
    state: Literal["ok", "modified", "missing", "unverified"]
    reason: str | None = None  # why it could not be verified


class Toolchain(BaseModel):
    """What spec-kit itself put into a project, and whether it is still intact."""

    speckit_version: str | None = None
    integration: str | None = None
    integrations: list[str] = Field(default_factory=list)
    script: str | None = None  # sh | ps
    feature_numbering: str | None = None
    files: list[ManifestFile] = Field(default_factory=list)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def drift(self) -> int:
        return sum(1 for f in self.files if f.state in ("modified", "missing"))


class WorkflowStep(BaseModel):
    id: str
    kind: Literal["command", "gate"]
    command: str | None = None
    message: str | None = None
    on_reject: str | None = None


class DeclaredWorkflow(BaseModel):
    """A pipeline a project committed to in `.specify/workflows/`.

    Listed even when only the registry knows about it, so a workflow whose file
    was deleted is visible as exactly that rather than absent.
    """

    id: str
    name: str | None = None
    version: str | None = None
    description: str | None = None
    source: str | None = None  # bundled | custom, from the registry
    steps: list[WorkflowStep] = Field(default_factory=list)
    error: str | None = None


class Artifact(BaseModel):
    """One markdown document inside a feature directory."""

    key: str  # spec | plan | tasks | research | data-model | quickstart | contracts/x
    file: str  # path relative to the feature directory
    label: str
    # The noun in front of a document is ours and is translated; the stem of a
    # contract or a checklist is the user's filename and is not.
    label_key: str = ""
    label_vars: dict[str, str | int] = Field(default_factory=dict)
    bytes: int
    modified: float
    headings: int = 0
    words: int = 0


class Progress(BaseModel):
    done: int = 0
    total: int = 0

    # computed_field, not a plain property: nested models are serialised by
    # pydantic's own serialiser, which never calls an overridden model_dump.
    @computed_field  # type: ignore[prop-decorator]
    @property
    def pct(self) -> int:
        return round(100 * self.done / self.total) if self.total else 0


class Commit(BaseModel):
    sha: str
    subject: str
    author: str
    date: str
    relative: str


class HistoryPoint(BaseModel):
    """Task completion of a whole project as of one commit."""

    sha: str
    date: str  # ISO 8601, author date
    subject: str
    done: int = 0
    total: int = 0
    features: int = 0  # how many tasks.md files existed at that revision

    @computed_field  # type: ignore[prop-decorator]
    @property
    def pct(self) -> int:
        return round(100 * self.done / self.total) if self.total else 0


class StaleFeature(BaseModel):
    """A feature folder no commit has touched in a while."""

    feature_id: str
    title: str | None = None
    date: str
    days: int
    subject: str | None = None


class ProjectHistory(BaseModel):
    """Movement rather than position, derived from git rather than a database.

    `available` is false — with a reason worth reading — whenever no series can
    honestly be drawn, so the board can say so instead of drawing nothing.
    """

    project_id: str
    available: bool = False
    reason: str | None = None
    reason_key: str | None = None
    points: list[HistoryPoint] = Field(default_factory=list)
    stale: list[StaleFeature] = Field(default_factory=list)
    commits_scanned: int = 0


class Feature(BaseModel):
    id: str  # directory name, e.g. 005-live-activities
    project_id: str
    number: str | None = None  # "005"
    slug: str
    title: str
    stage: Stage
    stage_reason: str
    status: str | None = None  # **Status**: line from spec.md
    branch: str | None = None
    created: str | None = None
    is_current: bool = False
    summary: str | None = None
    input: str | None = None

    progress: Progress = Field(default_factory=Progress)
    checklist_progress: Progress = Field(default_factory=Progress)

    artifacts: list[Artifact] = Field(default_factory=list)
    user_stories: list[UserStory] = Field(default_factory=list)
    # Setup, foundational and polish tasks belong to no story; carried separately
    # so a board of stories can show them rather than losing them.
    unassigned: UserStory | None = None
    phases: list[Phase] = Field(default_factory=list)
    tasks: list[Task] = Field(default_factory=list)
    checklists: list[Checklist] = Field(default_factory=list)
    requirements: list[Requirement] = Field(default_factory=list)
    success_criteria: list[Requirement] = Field(default_factory=list)
    edge_cases: list[str] = Field(default_factory=list)
    clarifications: list[str] = Field(default_factory=list)
    tech: dict[str, str] = Field(default_factory=dict)  # from plan.md Technical Context
    open_questions: list[str] = Field(default_factory=list)  # [NEEDS CLARIFICATION]
    entities: list[Entity] = Field(default_factory=list)  # spec.md Key Entities
    assumptions: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    # Ids declared twice inside one section. The parser keeps the first and
    # records the rest here rather than dropping the fact along with the bullet.
    duplicate_requirements: list[str] = Field(default_factory=list)

    # plan.md's constitution gate. None means the section is absent, which is a
    # different fact from a section that resolved to "unknown".
    constitution: ConstitutionResult | None = None
    # Derived, never stored: what this feature's own artefacts disagree about.
    findings: list[Finding] = Field(default_factory=list)

    modified: float = 0.0
    commits: list[Commit] = Field(default_factory=list)


class Project(BaseModel):
    id: str
    name: str
    path: str
    has_specify: bool = False
    constitution: str | None = None
    constitution_version: str | None = None
    current_feature: str | None = None
    branch: str | None = None
    features: list[Feature] = Field(default_factory=list)
    # Properties of the project rather than of any feature, so the portfolio
    # question can be answered without opening one.
    toolchain: Toolchain | None = None
    workflows: list[DeclaredWorkflow] = Field(default_factory=list)
    modified: float = 0.0
    error: str | None = None


class SearchHit(BaseModel):
    """One thing the index found, with enough context to open it."""

    kind: Literal["feature", "story", "task", "requirement", "checklist", "document"]
    project_id: str
    feature_id: str
    ref: str  # task id, story id, requirement id, or a document path
    file: str | None = None
    title: str
    subtitle: str
    # The matching text in context. Markers are \x02 and \x03 so the browser can
    # highlight without the payload ever being HTML.
    snippet: str = ""
    score: float = 0.0


class SearchResult(BaseModel):
    query: str
    hits: list[SearchHit] = Field(default_factory=list)
    total: int = 0
    took_ms: float = 0
    # "tokens", "substring" or "none" — the board says how it found something,
    # for the same reason a card says why it sits where it does.
    matched_by: Literal["tokens", "substring", "none"] = "none"
    suggestions: list[str] = Field(default_factory=list)


class Snapshot(BaseModel):
    generated_at: float
    root: str
    projects: list[Project] = Field(default_factory=list)
    scan_ms: int = 0

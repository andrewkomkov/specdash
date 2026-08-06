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


class Artifact(BaseModel):
    """One markdown document inside a feature directory."""

    key: str  # spec | plan | tasks | research | data-model | quickstart | contracts/x
    file: str  # path relative to the feature directory
    label: str
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
    phases: list[Phase] = Field(default_factory=list)
    tasks: list[Task] = Field(default_factory=list)
    checklists: list[Checklist] = Field(default_factory=list)
    requirements: list[Requirement] = Field(default_factory=list)
    success_criteria: list[Requirement] = Field(default_factory=list)
    edge_cases: list[str] = Field(default_factory=list)
    clarifications: list[str] = Field(default_factory=list)
    tech: dict[str, str] = Field(default_factory=dict)  # from plan.md Technical Context
    open_questions: list[str] = Field(default_factory=list)  # [NEEDS CLARIFICATION]

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
    modified: float = 0.0
    error: str | None = None


class Snapshot(BaseModel):
    generated_at: float
    root: str
    projects: list[Project] = Field(default_factory=list)
    scan_ms: int = 0

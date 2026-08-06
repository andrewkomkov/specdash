# Data Model: A live board for every spec-kit project on disk

Every entity here is derived from files. Nothing is stored, nothing has an id the user
assigns, and nothing survives a restart — the model is a parse of the disk at one moment.
Defined in `backend/app/models.py` (pydantic v2) and mirrored in `frontend/src/types.ts`.

## Snapshot

The unit of transfer. One snapshot is everything the board needs.

| Field | Type | Notes |
| --- | --- | --- |
| `generated_at` | float | epoch seconds of the scan |
| `root` | string | the scanned roots, for display |
| `projects` | Project[] | most recently modified first |
| `scan_ms` | int | how long the scan took; shown in the header |

## Project

A directory holding spec-kit state.

| Field | Type | Notes |
| --- | --- | --- |
| `id`, `name` | string | the directory name; also the accent-colour seed |
| `path` | string | absolute path inside the container |
| `has_specify` | bool | `.specify/` exists |
| `constitution` | string? | full text of `.specify/memory/constitution.md` |
| `constitution_version` | string? | parsed from its `**Version**` line |
| `current_feature` | string? | directory named by `.specify/feature.json` |
| `branch` | string? | `git rev-parse --abbrev-ref HEAD` |
| `features` | Feature[] | highest number first |
| `modified` | float | newest mtime across the project's features |
| `error` | string? | why the project is degraded, if it is |

**Rules**: a directory is a project when it holds `.specify/` or `specs/`. A project with
neither features nor `.specify/` is dropped.

## Feature

One numbered directory under `specs/`.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | directory name, e.g. `005-live-activities` |
| `project_id` | string | owning project |
| `number`, `slug` | string? / string | split from the directory name |
| `title` | string | from `spec.md`'s H1, else the slug title-cased |
| `stage` | enum | specify · clarify · plan · tasks · implement · done |
| `stage_reason` | string | the evidence, shown on the card (Principle II) |
| `status` | string? | the `**Status**` line, displayed but not obeyed |
| `branch`, `created` | string? | from `spec.md` |
| `is_current` | bool | matches the project's `current_feature` |
| `summary` | string? | first paragraph of Overview, else of the plan's Summary |
| `input` | string? | the original user description |
| `progress` | Progress | tasks done/total, with computed percentage |
| `checklist_progress` | Progress | across all checklists |
| `artifacts` | Artifact[] | every document in the folder |
| `user_stories` | UserStory[] | ordered by number |
| `phases` | Phase[] | ordered by index; only those holding tasks |
| `tasks` | Task[] | in file order |
| `checklists` | Checklist[] | one per file under `checklists/` |
| `requirements`, `success_criteria` | Requirement[] | FR/NFR and SC bullets |
| `edge_cases`, `clarifications` | string[] | folded bullets |
| `tech` | map | Technical Context from `plan.md` |
| `open_questions` | string[] | every `[NEEDS CLARIFICATION]` marker |
| `modified` | float | newest mtime in the folder; drives the change flash |

### Stage derivation

Evaluated in order; the first match wins:

| Condition | Stage | Reason string |
| --- | --- | --- |
| tasks exist and all ticked | `done` | `all N tasks ticked` |
| tasks exist and some ticked | `implement` | `N/M tasks ticked` |
| tasks exist and none ticked | `tasks` | `M tasks, none started` |
| `tasks.md` present but empty of tasks | `tasks` | `tasks.md present` |
| `plan.md` present | `plan` | `plan.md present, no tasks.md yet` |
| open clarification markers | `specify` | `N open clarification marker(s)` |
| clarifications recorded, or status says clarified/ready | `clarify` | `spec clarified, awaiting plan` |
| `spec.md` only | `specify` | `spec.md only` |

The declared status is consulted only in the last two rows. This is Principle II expressed
as a table.

## Task

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `T001`; synthesised `#n` only when the file uses no ids |
| `description` | string | emphasis and links flattened |
| `done` | bool | `[x]` or `[~]` |
| `parallel` | bool | the `[P]` tag |
| `story` | string? | `[US1]` tag, else the story named by the phase heading |
| `phase`, `phase_index` | string / int | owning phase |
| `line` | int | line in `tasks.md`, for locating it |
| `files` | string[] | backticked tokens that look like paths |

## Phase

`index`, `title`, `kind` (setup · foundational · story · polish · other), `story`,
`priority`, `goal`, `purpose`, `done`, `total`. Only phases containing tasks are kept, so
prose sections do not become empty columns in the drawer.

## UserStory

`id` (`US1`), `number`, `title`, `priority` (`P1`…), `why`, `independent_test`,
`narrative`, `acceptance` (numbered scenarios), and `done`/`total` folded in from the tasks
attributed to it. A story that appears only in `tasks.md` is synthesised so its work is
still visible.

## Checklist, Artifact, Requirement, Commit

- **Checklist**: `name`, `file`, `title`, `items[{text, done, section}]`, `done`, `total`.
- **Artifact**: `key`, `file`, `label`, `bytes`, `modified`, `headings`, `words`. `key` is
  the stem for known documents and the relative path for `contracts/*` and `checklists/*`.
- **Requirement**: `id` (`FR-001`, `SC-005A`), `text` — folded across wrapped lines.
- **Commit**: `sha`, `subject`, `author`, `date`, `relative`. Fetched per feature on
  demand, never during a scan.

## Progress

`done`, `total`, and a computed `pct`. Declared as a pydantic computed field so the
percentage survives serialisation of a nested model — a plain property does not.

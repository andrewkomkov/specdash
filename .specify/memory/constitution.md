# SpecDash Constitution

SpecDash reads other people's repositories and draws what it finds. Everything below
follows from that one sentence: the projects it looks at are the user's real work, and
this tool is a guest in them. A dashboard that damages, locks or rewrites the thing it
observes has failed no matter how good the board looks.

## Core Principles

### I. Read-only is not a setting (NON-NEGOTIABLE)

SpecDash never writes into a scanned project — not a cache file, not a lock file, not a
"just this once" fix to a malformed `tasks.md`. The code opens files for reading, stats
them, and lists directories. That is the whole vocabulary.

The property is enforced twice, and both are required. The application never opens a
scanned path for writing, and the container mounts every project path with `:ro`, so the
kernel refuses the write even if a future line of code asks for it. Belt and braces are
warranted here because the failure is silent and the blast radius is the user's source
of truth.

Git is read through commands that do not mutate a repository (`git log`,
`git rev-parse`), always with `--no-optional-locks`. A dashboard must never be the reason
an `index.lock` appears in someone's working tree while they are mid-rebase.

Consequently the dashboard has no write affordances at all: no drag between columns, no
ticking a checkbox, no editing a description. Every checkbox rendered is `readOnly`. A
control that looks editable and silently does nothing is worse than no control.

### II. The files are the truth, and disagree with the prose

A feature's stage is derived from what exists on disk and what is ticked in it, never
from what a `**Status**` line claims. `tasks.md` with 38 of 38 boxes ticked is *done*
even if the spec still says "ready for planning" — the checkbox is a claim about code,
the status line is a claim about intent, and when they disagree the artefact wins.

Every derived state carries its evidence. A card says *why* it sits in its column
(`all 38 tasks ticked`, `plan.md present, no tasks.md yet`) so a wrong placement is
debuggable by reading, not by guessing.

Nothing is invented. If a feature has no summary, the card has no summary; it does not
get a generated one. If a document is missing, its icon is dim — an absence is data.

### III. One malformed file may not blank the board

spec-kit templates drift between versions and people hand-edit the output. Parsing is
therefore tolerant: an unrecognised heading is skipped, an unreadable feature folder is
logged and omitted, and a project that fails to scan does not remove the projects that
scanned fine.

The inverse also holds: tolerant parsing must not become inventive parsing. Skipping
something unrecognised is correct; guessing what it probably meant is not.

### IV. A project is a directory, not a configuration entry

Anything under the mounted root holding `.specify/` or `specs/` is a project. Adding a
project means creating it; there is no registry to update, no per-project config file, and
nothing SpecDash needs written anywhere to notice it. Discovery does not descend into a
project it has already recognised, and never into `node_modules`, `.git` or build output.

### V. Live means the user never asks it to refresh

A change to a spec file appears on the board without a reload and without a button. The
manual refresh exists for the case where watching is impossible, not as the normal path.

Watching is scoped to the spec folders themselves rather than to whole repositories: on a
bind mount, polling is the only thing that works reliably, and polling a repository with
a `node_modules` in it is how a dashboard turns into a fan.

### VI. One command, one container, no internet

`docker compose up` is the entire installation. The image carries its own frontend, and
the running service makes no outbound network request of any kind — no CDN, no font host,
no telemetry, no update check. It reads local files and serves a local page.

### VII. The board answers the portfolio question first

The primary question is "where does everything stand, across all my projects" — not
"show me this one file". Cards therefore carry the state that answers it at a glance
(stage, progress, priorities, current feature) and everything else lives one click deeper.

Cross-project comparability outranks per-project customisation: a colour, a column and a
badge mean the same thing everywhere, so two projects can be read side by side.

## Development Workflow

Feature work starts with `/speckit-specify`. SpecDash is a spec-kit tool used on spec-kit
projects, and it eats its own cooking: its `specs/` directory is a fixture as well as a
plan, and it is expected to appear on its own board.

A parser change is not complete until it has been run against every project in the
author's mounted root, not only against the file that prompted the change. The tolerance
in Principle III is only real if it is exercised on real, drifted input.

## Governance

This constitution supersedes convenience. Principle I in particular is not subject to a
performance argument, a "just for this feature" exception, or a user request: a write path
into a scanned project may not be added, and any change that could introduce one requires
this document to be amended first.

**Version**: 1.0.0 | **Ratified**: 2026-08-06 | **Last Amended**: 2026-08-06

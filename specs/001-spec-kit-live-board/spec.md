# Feature Specification: A live board for every spec-kit project on disk

**Feature Branch**: `001-spec-kit-live-board`

**Created**: 2026-08-06

**Status**: Shipped — all five user stories, released as v0.2.0

**Input**: User description: "Есть spec-kit. Есть проекты на нём. Сделать сервис, который визуализирует работу — типа канбан или ещё что. Главное чтоб со всеми проектами работало: указываю папочку, и через докер поднимается вся визуализация, желательно супер красивая, карточки чтоб там и всё-всё. При этом чтоб наша софтина только на чтение. И обновлялась типа реалтайм. Всё в один image. Проект открытый, репа публичная."

## Overview

Someone running spec-kit across several repositories has their planning state spread over
dozens of markdown files: a `spec.md` here, a half-ticked `tasks.md` there, a
`feature.json` naming whichever feature is current. Answering "where does everything
stand" means opening folders one at a time and holding the answer in your head.

SpecDash turns that scattered state into one board. It is pointed at a directory, finds
every spec-kit project underneath it, and lays every feature out across the six stages of
the spec-kit pipeline — Specify, Clarify, Plan, Tasks, Implement, Done — as cards carrying
progress, priorities and open questions. It follows the files as they change, and it never
writes to them.

It is a viewer, not a tracker. The source of truth stays where spec-kit put it: in the
repository, under version control, edited by the agent and the human. This tool only looks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See every project's state on one board (Priority: P1)

Someone with four spec-kit repositories opens one page and sees all of their features laid
out by pipeline stage, each card showing which project it belongs to, how far its task list
has got, and which stories are still open. They can tell in a glance which project has
stalled and which feature is nearly finished, without opening a single file.

**Why this priority**: This is the entire premise. It needs no watching, no drill-down and
no history — a static render of a correct scan already replaces the folder-by-folder walk,
and everything else in this feature makes it better rather than makes it work.

**Independent Test**: Point the service at a directory holding at least two spec-kit
projects. Every feature folder appears exactly once, in the column its files justify, with
its task counts matching a manual count of ticked boxes in `tasks.md`.

**Acceptance Scenarios**:

1. **Given** a mounted directory containing several spec-kit projects, **When** the board
   is opened, **Then** every directory holding `.specify/` or `specs/` is listed as a
   project and each of its numbered feature folders appears as one card.
2. **Given** a feature whose `tasks.md` has 24 of 24 boxes ticked, **When** the board
   renders, **Then** the card sits in Done and reports 24/24 and 100%.
3. **Given** a feature with `spec.md` and `plan.md` but no `tasks.md`, **When** the board
   renders, **Then** the card sits in Plan and states that as its reason.
4. **Given** a feature whose spec says "ready for planning" but whose `tasks.md` is fully
   ticked, **When** the board renders, **Then** the card sits in Done — the artefacts
   outrank the prose.
5. **Given** a project whose `.specify/feature.json` names a feature directory, **When**
   the board renders, **Then** that feature's card is marked as the current one.
6. **Given** a directory that is not a spec-kit project, **When** discovery runs, **Then**
   it produces no card and no error.

---

### User Story 2 - Read a feature without leaving the board (Priority: P1)

Having spotted the interesting card, the same person opens it and reads the feature: what
it is for, its user stories with their acceptance scenarios, its task list grouped by phase
with what is done and what is not, its quality checklists, and the raw documents
themselves — spec, plan, research, data model, contracts — rendered in place.

**Why this priority**: A board that can only be pointed at is a status light. The reason
to look at a feature is to understand it, and the documents are already written; the
value is in not having to go and find them.

**Independent Test**: Open any card and read its stories, its per-phase task breakdown and
the full text of every markdown document in the feature folder, without opening an editor.

**Acceptance Scenarios**:

1. **Given** an open feature, **When** the overview is shown, **Then** each user story
   appears with its priority, its acceptance scenarios and the count of tasks that serve it.
2. **Given** an open feature, **When** the task list is shown, **Then** tasks are grouped
   by phase, each carrying its id, its done state, its parallel marker and the files it
   names, and can be regrouped by user story or filtered to the unfinished ones.
3. **Given** an open feature, **When** a document is selected, **Then** its markdown is
   rendered — headings, tables, code and task lists — from the file on disk.
4. **Given** a spec containing `[NEEDS CLARIFICATION]` markers, **When** the feature is
   opened, **Then** those markers are surfaced as open questions rather than buried.
5. **Given** a requirement wrapped across several lines in the source markdown, **When** it
   is displayed, **Then** the whole requirement is shown, not the first line of it.

---

### User Story 3 - Watch it change while working (Priority: P2)

Someone runs `/speckit-tasks` in one window with the board open in another. As the agent
ticks boxes and writes files, the affected card updates on its own — progress moves, the
card changes column when the change warrants it, and it pulses so the eye is drawn to what
just moved.

**Why this priority**: It turns the board from a report into an instrument, and it is what
makes it worth leaving open on a second screen. It is P2 rather than P1 because a manual
refresh delivers the same information a few seconds later.

**Independent Test**: With the board open, tick a box in a `tasks.md` in any scanned
project. The card's progress updates and the card highlights, with no interaction.

**Acceptance Scenarios**:

1. **Given** an open board, **When** a spec file changes on disk, **Then** the affected
   card updates without a page reload and without any user action.
2. **Given** a change that completes the last task, **When** the update arrives, **Then**
   the card moves from Implement to Done.
3. **Given** a burst of writes, **When** they land within a few hundred milliseconds of
   each other, **Then** they are coalesced into one rescan rather than one per file.
4. **Given** a new feature directory is created, **When** the next scan runs, **Then** a
   card for it appears without restarting the service.
5. **Given** the connection to the server drops, **When** it is restored, **Then** the
   board reconnects and resynchronises on its own, and says which state it is in
   meanwhile.

---

### User Story 4 - Run it in one command, safely (Priority: P1)

Someone clones the repository, writes one path into `.env`, and runs `docker compose up`.
A single image serves the whole thing. Their repositories are mounted read-only, and no
part of the system can write to them.

**Why this priority**: An observability tool that is fiddly to start does not get started,
and one that might touch the repositories it observes does not get pointed at anything
that matters. Both properties are preconditions for the rest of the feature being used
at all.

**Independent Test**: On a clean machine with Docker, clone, set `PROJECTS_ROOT`, run
`docker compose up`, and open the port. Then attempt to write to a mounted project from
inside the container and observe the failure.

**Acceptance Scenarios**:

1. **Given** a clone and a `PROJECTS_ROOT`, **When** `docker compose up` is run, **Then**
   the board is served from a single container on a single port.
2. **Given** the running container, **When** a write to any path under the mounted root is
   attempted, **Then** it fails at the filesystem layer.
3. **Given** the running container, **When** its outbound network activity is observed,
   **Then** it makes no external request — the page loads no CDN, font or script from the
   internet.
4. **Given** a project under git, **When** history is displayed, **Then** it is obtained
   with read-only git commands that create no lock file in the user's repository.
5. **Given** `PROJECTS_ROOT` is unset, **When** compose is run, **Then** it fails with a
   message naming the variable rather than starting with an empty board.

---

### User Story 5 - Compare progress over time (Priority: P3)

Someone wants to see movement rather than position: how a project's task completion has
moved over the last weeks, which features have been untouched longest, and where work
actually happened.

**Why this priority**: It answers a real question — velocity and neglect — but it needs
history the filesystem does not carry, so it is the one part of this feature that requires
storing something. It is last because the board is fully useful without it.

**Independent Test**: With the board running for some days, open the trend view and see
each project's completion over time, derived from git history rather than from a database.

**Acceptance Scenarios**:

1. **Given** a project under git, **When** the trend view is opened, **Then** task
   completion over time is derived from the history of its `specs/` directory.
2. **Given** a project not under git, **When** the trend view is opened, **Then** it says
   history is unavailable rather than showing an empty chart.

---

### Edge Cases

- A feature folder holding only `spec.md` and no tasks. It is a legitimate state — the
  card shows the stage and no progress bar, rather than 0% which would read as failure.
- A `tasks.md` whose checkboxes carry no `T###` ids. The count still has to be right; ids
  are a convention, not a guarantee.
- A `tasks.md` with checkboxes in a "Prerequisites" or "Format" section that are not
  tasks. These must not inflate the total.
- Two projects with the same directory name under different parents. Each must remain
  addressable and distinguishable on the board.
- A feature folder that is unreadable (permissions). It is skipped and logged; the
  remaining features still render.
- A document larger than a couple of megabytes. It is refused for display rather than
  streamed into the browser.
- A `file` parameter pointing outside the feature folder (`../../etc/passwd`). Refused —
  the resolved path must stay inside the project.
- A project directory that disappears while the board is open. The next scan drops it
  without an error dialog.
- A mounted root with no spec-kit projects at all. The board says so and explains what it
  looks for.
- Sub-second bursts of writes from an agent rewriting several files at once. One rescan,
  not five.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST discover projects by walking a configured root to a
  configured depth and treating any directory containing `.specify/` or `specs/` as a
  project, without descending further into a recognised project.
- **FR-002**: The system MUST skip `node_modules`, `.git`, build output and other
  well-known heavy directories during discovery.
- **FR-003**: The system MUST parse each numbered directory under `specs/` as a feature,
  reading `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`,
  `quickstart.md`, `contracts/*` and `checklists/*` when present.
- **FR-004**: The system MUST extract from `tasks.md` every task's id, description, done
  state, parallel marker, owning phase, owning user story and any file paths it names.
- **FR-005**: The system MUST count only genuine task checkboxes, ignoring checkboxes in
  non-task sections such as Format, Prerequisites and Dependencies.
- **FR-006**: The system MUST extract from `spec.md` the title, feature branch, creation
  date, status, original input, summary, user stories with priorities and acceptance
  scenarios, functional requirements, success criteria, edge cases, clarifications and
  every `[NEEDS CLARIFICATION]` marker.
- **FR-007**: The system MUST reassemble values that wrap across multiple source lines
  into a single value.
- **FR-008**: The system MUST assign each feature exactly one pipeline stage from
  {specify, clarify, plan, tasks, implement, done}, derived from which artefacts exist and
  what proportion of tasks is ticked.
- **FR-009**: The system MUST prefer artefact evidence over any declared status when the
  two disagree.
- **FR-010**: The system MUST state, for every feature, the reason it was placed in its
  stage.
- **FR-011**: The system MUST mark the feature named by `.specify/feature.json` as the
  project's current feature.
- **FR-012**: The system MUST attribute tasks to the user stories they serve, using both
  the story tag on a task and the story named by its phase heading.
- **FR-013**: The system MUST present features as cards grouped into one column per
  pipeline stage.
- **FR-014**: Each card MUST show its project, feature number, title, stage evidence, task
  progress, per-story priority and progress, which documents exist, checklist completion,
  open-question count and time since last change.
- **FR-015**: The system MUST allow a card to be opened for detail covering overview, task
  list, checklists, rendered documents and git history.
- **FR-016**: The system MUST render the raw markdown of any document in a feature folder
  on request.
- **FR-017**: The system MUST refuse to serve any path that resolves outside the project
  directory, and any document above a size limit.
- **FR-018**: The system MUST allow filtering by project and free-text search across
  feature titles, summaries and task descriptions.
- **FR-019**: The system MUST watch the spec directories of discovered projects and push
  an updated view to connected browsers when they change.
- **FR-020**: The system MUST coalesce bursts of filesystem events into a single rescan.
- **FR-021**: The system MUST watch only spec-kit directories, never entire repositories.
- **FR-022**: The system MUST re-discover projects periodically so that a newly created
  project appears without a restart.
- **FR-023**: The system MUST highlight cards whose files changed recently.
- **FR-024**: The system MUST reconnect automatically after losing its live connection,
  and MUST show the connection state.
- **FR-025**: The system MUST NOT write, create, delete or modify anything inside a
  scanned project, under any circumstance.
- **FR-026**: The system MUST use only read-only git invocations, with optional locks
  disabled.
- **FR-027**: The system MUST render every checkbox as read-only and offer no editing
  affordance.
- **FR-028**: The system MUST ship as a single container image serving both API and
  frontend on one port.
- **FR-029**: The system MUST mount project paths read-only at the container level.
- **FR-030**: The system MUST make no outbound network request at runtime, and the page
  MUST load no external asset.
- **FR-031**: The system MUST continue to render every other project when one project or
  feature fails to parse, and MUST log what it skipped.
- **FR-032**: The system MUST support both light and dark presentation.

### Key Entities

- **Project**: a directory holding spec-kit state — its name, path, git branch,
  constitution and version, the feature it currently has checked out, and its features.
- **Feature**: one numbered directory under `specs/` — its number, slug, title, stage and
  the evidence for that stage, status, progress, and everything parsed out of its
  documents.
- **Task**: one checkbox in `tasks.md` — id, description, done state, parallel marker,
  owning phase and story, and the files it names.
- **Phase**: a section of `tasks.md` — its title, kind, the story it serves, and its
  progress.
- **User story**: a prioritised journey from `spec.md`, with its acceptance scenarios and
  the tasks attributed to it.
- **Checklist**: a quality gate under `checklists/`, with its items and completion.
- **Artifact**: one document in a feature folder — its path, size and last change.
- **Snapshot**: everything above for every project at one moment, as pushed to browsers.

## Success Criteria *(mandatory)*

- **SC-001**: A user with several spec-kit repositories can state the stage and progress of
  every feature they have, from one screen, without opening a file.
- **SC-002**: Adding a new project means creating the directory — no configuration file is
  edited and nothing is restarted for it to appear.
- **SC-003**: A change to a spec file is reflected on an open board within a few seconds,
  with no user action.
- **SC-004**: Scanning a root of a handful of projects completes fast enough to be
  invisible — well under a second — and a rescan is triggered by change, not by a timer
  the user notices.
- **SC-005**: No file inside any scanned project is modified, created or deleted by the
  running system — verifiable by comparing a recursive checksum of the root before and
  after a session.
- **SC-006**: Going from a fresh clone to a working board takes one configuration value
  and one command.
- **SC-007**: A malformed or unrecognised document costs at most its own feature card;
  every other card still renders.
- **SC-008**: Every stage placement on the board can be justified by the evidence the card
  itself states.

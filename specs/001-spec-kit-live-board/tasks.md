---

description: "Task list for the SpecDash live board"
---

# Tasks: A live board for every spec-kit project on disk

**Input**: Design documents from `/specs/001-spec-kit-live-board/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/http-api.md](./contracts/http-api.md)

**Tests**: `backend/tests/` holds fixtures of the drift catalogued in `research.md` and
runs in CI alongside the scan of this repository and the image job's read-only assertion.
Writing them found one real defect — `SC-005a` was being displayed as `SC-005A`, an id that
matches nothing in the document a reader is holding — which is the argument for fixtures
over a smoke gate in one line.

**Ticked against the code on 2026-08-06.** Everything marked done exists and runs in the
container. A checkbox here is a claim about the code, and CI fails when a claim stops
holding.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: Which user story the task serves (US1–US5)

## Path Conventions

`backend/app/` for the service, `frontend/src/` for the board, repository root for the
image and compose file.

---

## Phase 1: Setup

**Purpose**: The skeleton both halves are built in.

- [x] T001 Create the `backend/app/` package and `frontend/` Vite scaffold, one image, two source trees as decided in plan.md
- [x] T002 [P] Pin backend dependencies in `backend/requirements.txt` — FastAPI, uvicorn, pydantic v2, watchfiles
- [x] T003 [P] Pin frontend dependencies in `frontend/package.json` — React 19, Mantine 8, tabler icons, react-markdown, remark-gfm
- [x] T004 [P] Configure Vite in `frontend/vite.config.ts` to proxy `/api` and `/ws` to the backend during development
- [x] T005 [P] Declare CSS-module typings in `frontend/src/vite-env.d.ts` so `*.module.css` imports typecheck

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The domain model and configuration everything else reads. Nothing below can be
built without these.

- [x] T006 Define the pydantic domain model in `backend/app/models.py` — Snapshot, Project, Feature, Task, Phase, UserStory, Checklist, Artifact, Requirement, Commit, Progress
- [x] T007 Express `Progress.pct` as a pydantic `computed_field` — a plain property is silently dropped when the model is nested inside another model's serialisation
- [x] T008 [P] Read configuration from the environment in `backend/app/config.py` — roots, explicit projects, depth, git on/off, debounce, static directory
- [x] T009 [P] Mirror the model in `frontend/src/types.ts`, with the stage list, stage labels, stage colours and priority colours the UI keys off

---

## Phase 3: User Story 1 — See every project's state on one board (Priority: P1)

**Goal**: Point the service at a directory and get every feature of every project laid out
by pipeline stage, with progress that matches the files.

**Independent test**: Every feature folder appears exactly once, in the column its files
justify, with task counts matching a manual `grep -c` of ticked boxes.

- [x] T010 [US1] Write the generic markdown helpers in `backend/app/parsing.py` — section splitting, heading lookup, emphasis flattening, frontmatter stripping
- [x] T011 [US1] Fold wrapped continuation lines in `Section.field()` and `Section.bullets()`; real specs wrap constantly and a line-at-a-time reader truncates most values
- [x] T012 [US1] Parse `tasks.md` into phases and tasks — id, done state, `[P]`, `[US#]`, owning phase, line number, referenced files
- [x] T013 [US1] Exclude non-task sections (Format, Prerequisites, Dependencies, Notes) from the task count, and fall back to counting bare checkboxes only when a file uses no `T###` ids at all
- [x] T014 [US1] Parse `spec.md` — title, branch, created, status, input, overview summary, user stories with priorities and acceptance scenarios, requirements, success criteria, edge cases, clarifications, `[NEEDS CLARIFICATION]` markers
- [x] T015 [US1] Match requirement ids with an optional letter suffix so `SC-005a` is not collapsed into `SC-005`
- [x] T016 [US1] Parse `plan.md` Summary and Technical Context into a key-value map
- [x] T017 [US1] Parse `checklists/*.md` into items with their sections and completion
- [x] T018 [US1] Implement discovery in `backend/app/scanner.py` — walk the root to a depth, recognise `.specify/`/`specs/`, do not descend into a recognised project, skip `node_modules`/`.git`/build output
- [x] T019 [US1] Implement `scan_feature` — collect artefacts, run the parsers, attribute tasks to user stories, synthesise stories that exist only in `tasks.md`
- [x] T020 [US1] Implement stage derivation with an evidence string, artefacts outranking the declared status
- [x] T021 [US1] Implement `scan_project` — `.specify/feature.json` for the current feature, constitution and its version, git branch, features sorted newest first
- [x] T022 [US1] Catch per-feature and per-project failures so one bad folder cannot blank the board, and log what was skipped
- [x] T023 [US1] Serve `GET /api/snapshot`, `GET /api/health` and `GET /api/meta` from `backend/app/main.py`
- [x] T024 [P] [US1] Build the six-column board in `frontend/src/components/Board.tsx` with per-column counts and task totals
- [x] T025 [P] [US1] Build the card in `frontend/src/components/FeatureCard.tsx` — number, project, title, summary, progress ring and bar, per-story priority badges, artefact icons, checklist and open-question badges, current marker, relative time
- [x] T026 [P] [US1] Give each project a stable accent colour derived from its name in `frontend/src/utils.ts`
- [x] T027 [US1] Assemble the shell in `frontend/src/App.tsx` — header, project chips, portfolio totals, empty and loading states
- [x] T028 [US1] Add project filtering and free-text search across titles, summaries and task descriptions, with the filter persisted in localStorage rather than on disk

**Checkpoint**: The board renders every project correctly from a cold start.

---

## Phase 4: User Story 2 — Read a feature without leaving the board (Priority: P1)

**Goal**: Open a card and read the whole feature — stories, tasks, checklists, documents.

**Independent test**: Every markdown document in a feature folder is readable from the
drawer, and the task list can be regrouped and filtered.

- [x] T029 [US2] Serve `GET .../doc?file=` for raw document text
- [x] T030 [US2] Refuse any `file` that resolves outside the project directory, and any document over 2 MB
- [x] T031 [US2] Serve `GET .../commits` per feature, on demand only — a `git log` per feature during a scan would dominate the rescan that follows every save
- [x] T032 [US2] Build the drawer in `frontend/src/components/FeatureDrawer.tsx` with tabs for overview, tasks, checklists, documents and history
- [x] T033 [US2] Overview panel — open questions alert, summary, stat tiles, user stories as an accordion with acceptance scenarios on a timeline, technical context table, success criteria, requirements, edge cases, clarifications, original input
- [x] T034 [US2] Tasks panel — grouped by phase or by story, filterable to unfinished, showing ids, parallel markers, story tags and referenced files
- [x] T035 [US2] Checklists panel — per-file completion and items
- [x] T036 [US2] Documents panel — file list with sizes and times, rendering the selected document
- [x] T037 [US2] Render markdown in `frontend/src/components/MarkdownView.tsx` with GFM tables and task lists, mapped onto the component system
- [x] T038 [US2] Render every checkbox as read-only, everywhere — a control that looks editable and does nothing is worse than no control (Principle I)
- [x] T039 [US2] Keep the open drawer bound to the live snapshot, so a feature that changes while open updates in place instead of showing a stale copy

**Checkpoint**: A feature can be read end to end without an editor.

---

## Phase 5: User Story 3 — Watch it change while working (Priority: P2)

**Goal**: The board follows the agent as it works, with no reload and no button.

**Independent test**: Tick a box in any scanned `tasks.md` and watch the card move.

- [x] T040 [US3] Implement the websocket hub in `backend/app/main.py` — connect, broadcast, drop dead clients, accept `ping` and `refresh` frames
- [x] T041 [US3] Implement the watch loop over each project's `.specify/` and `specs/` directories only, never whole repositories
- [x] T042 [US3] Default to `force_polling`: bind mounts on macOS and Windows never deliver inotify events, and a live feature that silently never fires is the worst failure mode available
- [x] T043 [US3] Debounce bursts of writes into a single rescan
- [x] T044 [US3] Re-discover projects on the watcher's periodic timeout so a brand-new project appears without a restart, and restart the watcher when the set of watched folders changes
- [x] T045 [US3] Survive watcher errors — log and restart the loop rather than taking the server down with it
- [x] T046 [US3] Run the scan off the event loop with `asyncio.to_thread` so a slow filesystem cannot stall connected clients
- [x] T047 [US3] Implement the client transport in `frontend/src/useSnapshot.ts` — websocket, automatic reconnect, connection state, initial fetch so first paint does not wait on the handshake
- [x] T048 [US3] Flash cards whose `modified` timestamp advanced between snapshots, and honour `prefers-reduced-motion`
- [x] T049 [US3] Show connection state and the reason for the last update in the header
- [x] T050 [P] [US3] Add a manual refresh — button and `r` key — as the fallback path for when watching is impossible

**Checkpoint**: The board is an instrument, not a report.

---

## Phase 6: User Story 4 — Run it in one command, safely (Priority: P1)

**Goal**: One image, one command, and no way to write to the observed repositories.

**Independent test**: Clone, set one variable, `docker compose up`; then fail to write to a
mounted project from inside the container.

- [x] T051 [US4] Write the multi-stage `Dockerfile` — node builds the frontend, the python stage serves it, one image
- [x] T052 [US4] Serve the built frontend from FastAPI with an SPA fallback, so there is one port and no web server to configure
- [x] T053 [US4] Mount every project path `:ro` in `docker-compose.yml`, and run the container `read_only` and non-root with `no-new-privileges`
- [x] T054 [US4] Fail compose with a message naming `PROJECTS_ROOT` when it is unset, rather than starting with an empty board
- [x] T055 [US4] Restrict git to `log` and `rev-parse` with `--no-optional-locks`, so no `index.lock` can appear in a user's working tree
- [x] T056 [US4] Bundle every asset into the image — no CDN, no font host, no telemetry, no update check
- [x] T057 [US4] Add a container healthcheck against `/api/health`
- [x] T058 [P] [US4] Write `.env.example` with a placeholder path, not the author's own
- [x] T059 [P] [US4] Write the README — what it is, one-command run, configuration table, the read-only guarantee and how to verify it
- [x] T060 [P] [US4] Add the MIT licence
- [x] T074 [US4] Publish a multi-arch image (amd64 + arm64) to `ghcr.io/andrewkomkov/specdash`, and default `docker-compose.yml` to it so the published image is the path of least resistance

**Checkpoint**: A stranger can run it against their own repositories in one command.

---

## Phase 7: User Story 5 — Compare progress over time (Priority: P3)

**Goal**: Show movement rather than position, derived from git rather than from a database.

**Independent test**: Open the trend view and read task completion over time for a project
under git; a project without git says history is unavailable.

- [x] T061 [US5] Walk `git log` over a project's `specs/` directory and parse each revision's `tasks.md` completion into a time series, on demand and cached in memory only
- [x] T062 [US5] Serve the series from a new endpoint documented in `contracts/http-api.md`
- [x] T063 [US5] Add a trend view to the board with completion over time per project
- [x] T064 [US5] Show a stale-work signal — features untouched longest — alongside the trend
- [x] T065 [US5] State plainly that history is unavailable for a project not under git, rather than drawing an empty chart
- [x] T079 [US5] Plot the task total alongside the completed count — work being added is the other half of the story, and a chart of percentages alone hides it
- [x] T080 [US5] Confine every git invocation to one module with a read-only subcommand allow-list, so the walk cannot become a write path by accident

**Checkpoint**: The board can answer "is this moving", not only "where is this".

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: The things that keep the above true after the next change.

- [x] T066 [P] Add parser tests over fixtures capturing the real drift found in `research.md` — wrapped values, `SC-005a`, checkboxes in non-task sections, phase headings that name a story and a priority, a `tasks.md` with no ids at all
- [x] T067 [P] Add a test asserting stage derivation prefers artefacts over a contradicting status line
- [x] T068 [P] Add a test asserting `doc?file=../../etc/passwd` is refused
- [x] T069 [P] Add a read-only regression test: checksum a fixture tree, run a full scan against it, checksum again, assert equality
- [x] T081 Preserve the case of a requirement id's letter suffix — upper-casing the whole token turned `SC-005a` into `SC-005A`, an id matching nothing in the document; found by T066
- [x] T070 Add CI — frontend typecheck and build, backend compile, and a scan of this repository asserting stage, stories and de-duplicated requirements
- [x] T075 Build and push the image from CI on a release, so the published image cannot drift from the source it claims to be
- [x] T076 Assert the read-only guarantee in CI: run the image against the checkout mounted `:ro` and fail the build if a write into it succeeds
- [x] T077 Adopt release-please — conventional commits drive the version, the changelog and the release that triggers the image publish
- [x] T078 Publish to ghcr rather than Docker Hub, so releasing needs no long-lived registry secret; the one-time "make the package public" step is written down in the README rather than left in someone's memory
- [x] T071 Split the frontend bundle — the markdown renderer and the trend view now load when they are first reached, not on first paint
- [x] T072 Handle two projects with the same directory name under different parents, which currently collide on `id`
- [x] T073 Show a project-level error state on the board when a project scans with `error` set, instead of only logging it
- [x] T082 Run the backend test suite in CI, and assert the git-derived series against this repository's own history
- [x] T083 Honour `SPECDASH_MAX_DEPTH` in discovery — it was read from the environment, documented in the README, and then never passed to the walk

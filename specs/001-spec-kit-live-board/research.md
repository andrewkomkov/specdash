# Research: A live board for every spec-kit project on disk

The unknowns here were not algorithmic. They were "what does spec-kit actually put on
disk", "how do you watch a bind mount from a container", and "how do you make read-only a
property rather than a promise".

## What spec-kit actually writes

Examined: four real projects (an Android app, a ClickHouse hackathon web app, a health
sync app, a GIS CMS), 18 features, spec-kit 0.14.2, written across several weeks by
different agent runs and hand-edited afterwards.

Consistent across all of them:

- `.specify/` holds `feature.json` (`{"feature_directory": "specs/004-..."}`), `memory/constitution.md`,
  `templates/`, `scripts/`, and integration manifests.
- `specs/NNN-slug/` per feature. `spec.md` always; `plan.md`, `tasks.md`, `research.md`,
  `data-model.md`, `quickstart.md` when the pipeline reached that step; `contracts/` and
  `checklists/` as directories.
- `spec.md` carries `**Feature Branch**`, `**Created**`, `**Status**`, `**Input**` as bold
  key-value lines, `### User Story N - Title (Priority: PN)` headings, `**Acceptance
  Scenarios**:` followed by a numbered list, and `- **FR-001**: ...` requirement bullets.
- `tasks.md` carries `## Phase N: Title` headings and `- [x] T001 [P] [US1] description`
  checkboxes, with file paths in backticks.

**Decision**: parse these shapes directly rather than adopting a markdown AST library.

**Rationale**: the documents are template output, so the shapes are stable enough to match
with regular expressions, and the parser needs to be tolerant of drift rather than correct
about markdown. An AST would tell us about emphasis and lists; it would not tell us that a
heading names a user story.

**Alternatives considered**: `markdown-it-py` plus a tree walk — more machinery, same
regexes in the end, and a dependency in the runtime image.

### Drift found in real files, which shaped the parser

- Values wrap across lines constantly. `**Storage**: Two new preferences in the existing
  DataStore-backed ...` continues on the next physical line. A line-at-a-time reader
  truncates most of the interesting content — this was found only by running against real
  files, and it is why folding continuation lines is a requirement rather than a nicety.
- Requirement ids take letter suffixes: `SC-005a` sits next to `SC-005`.
- Phase headings vary: `## Phase 3: User Story 4 — Understand why ... (Priority: P3, built first)`
  carries the story, the priority and an em dash in one line.
- Some `tasks.md` files carry checkboxes in `Prerequisites` and `Format` sections that are
  not tasks. Counting every checkbox in the file inflates the total by a handful, which is
  enough to make a Done feature look unfinished.
- Task ids are near-universal but not guaranteed. Fallback: if a file contains no
  `T###` at all, count its checkboxes anyway.

## Deriving a pipeline stage

**Decision**: derive stage from artefacts and tick counts, and consult `**Status**` only
when there is no `tasks.md`.

**Rationale**: real specs disagree with themselves. `005-live-activities` says
"Clarified — ready for planning" and has 38 of 38 tasks ticked; its `tasks.md` even records
an audit that corrected checkboxes in both directions against the code. The prose is the
oldest thing in the folder and the checkboxes are the newest.

**Alternatives considered**: trusting `**Status**` (wrong in 3 of 18 features examined);
using git activity (noisy — an unrelated repo-wide reformat touches every spec).

## Watching files inside a container

**Decision**: `watchfiles` with `force_polling` on by default, `poll_delay_ms=800`, scoped
to each project's `.specify/` and `specs/` directories, plus a periodic re-discovery.

**Rationale**: Docker bind mounts on macOS and Windows do not propagate inotify events to
the container — native watching silently never fires, which is the worst possible failure
for a "live" feature. Polling always works. Polling is only affordable because the watched
set is the spec folders and not the repositories: polling a repository with `node_modules`
in it would walk hundreds of thousands of paths every second.

The periodic timeout (`rust_timeout` + `yield_on_timeout`) doubles as the mechanism for
noticing a brand-new project, since a directory that does not exist yet cannot be watched.

**Alternatives considered**: native inotify (silently dead on macOS); a plain polling loop
that stats every file (the same work, hand-rolled); a client-side poll of the API (moves
the cost to every open tab).

## Making read-only structural

**Decision**: three independent mechanisms — the code never opens a scanned path for
writing; compose mounts every project path `:ro`; the container runs `read_only: true` as a
non-root user.

**Rationale**: Principle I is the one property whose violation is both silent and
catastrophic. Code review alone cannot guarantee it across future changes; the kernel can.

Git needed care: `git log` is read-only in effect, but git will happily create lock files
during other operations, so invocations are limited to `log` and `rev-parse` and carry
`--no-optional-locks`. Mounting `:ro` means git could not write even if asked, but the flag
documents the intent at the call site.

**Alternatives considered**: an allowlist wrapper around `open()` — more code, weaker
guarantee, and it does not constrain subprocesses.

## Transport for live updates

**Decision**: push the entire snapshot over a websocket on every change.

**Rationale**: for a root of four projects the serialised snapshot is a few hundred
kilobytes over a local socket, and whole-state transfer removes an entire class of bug —
there is no client-side merge, no ordering problem, and no way for the board to drift from
disk. The frontend diffs `modified` timestamps between snapshots purely to decide what to
highlight.

**Alternatives considered**: server-sent events (no client→server channel for a manual
refresh); JSON-patch deltas (a merge to get wrong, for bytes that do not matter at this
scale); polling (wasteful and laggy).

## Component system

**Decision**: Mantine 8, with CSS modules only for the board grid and card chrome.

**Rationale**: the request was for something that looks finished — cards, rings, drawers,
tabs, timelines, tooltips, light/dark. Mantine ships all of it with a coherent visual
language and no runtime CSS-in-JS; hand-rolling it would have been the bulk of the work and
would have looked worse. Its stylesheet is bundled into the image, satisfying the
no-external-assets rule.

**Alternatives considered**: Tailwind plus shadcn/ui (a component generator plus a design
system to assemble); hand-written CSS (slower, and the result reads as hand-written).

# Implementation Plan: A live board for every spec-kit project on disk

**Branch**: `001-spec-kit-live-board` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-spec-kit-live-board/spec.md`

## Summary

A FastAPI process scans a mounted root for spec-kit projects, parses their markdown into a
typed snapshot, watches the spec folders for changes, and pushes the whole snapshot over a
websocket to a React board that draws one column per pipeline stage. The frontend is built
at image build time and served as static files by the same process, so the deliverable is
one container on one port. Every project path is mounted `:ro`.

## Technical Context

**Language/Version**: Python 3.13 (backend), TypeScript 5.8 / React 19 (frontend)

**Primary Dependencies**: FastAPI + uvicorn, pydantic v2, watchfiles for change detection;
Mantine 8 for the component system, `@tabler/icons-react`, `react-markdown` + `remark-gfm`.
No CSS framework beyond Mantine and a handful of CSS modules.

**Storage**: None. The filesystem is the database; the snapshot is held in memory and
rebuilt from disk on every change. Nothing is persisted, which is what makes the read-only
guarantee cheap to keep.

**Testing**: The scanner is run against every project in the author's mounted root — the
drifted real input is the test fixture that matters. Health and snapshot endpoints are
checked from the running container.

**Target Platform**: Docker, Linux container, browser. Developed on macOS, where bind
mounts do not deliver inotify events — polling is therefore the default watch mode.

**Project Type**: Web application — `backend/` and `frontend/` in one image.

**Performance Goals**: A full scan of a root with a handful of projects under 500 ms, so a
rescan-on-every-change is affordable and no incremental parsing machinery is needed.

**Constraints**: No writes to scanned projects (Principle I). No outbound network at
runtime, including page assets. Per-feature git history is fetched on demand, never during
a scan — a `git log` per feature would dominate the rescan that follows every save.

**Scale/Scope**: Tens of projects, hundreds of features, thousands of tasks. Above that the
whole-snapshot-over-websocket approach would need replacing with deltas.

## Constitution Check

| Principle | How this design satisfies it |
| --- | --- |
| I. Read-only is not a setting | Scanner uses `open`/`stat`/`iterdir` only; compose mounts `:ro`; `read_only: true` on the container; git calls limited to `log`/`rev-parse` with `--no-optional-locks`; every rendered checkbox is `readOnly`. |
| II. Files are the truth | `_decide_stage` reads artefacts and tick counts first and consults the status line only when there is no `tasks.md`; it returns a reason string that the card displays. |
| III. One malformed file may not blank the board | Every parser skips what it cannot recognise; `scan_feature` failures are caught per feature, `scan_project` failures per project. |
| IV. A project is a directory | `discover()` walks the root and matches on `.specify/`/`specs/`; no registry exists. |
| V. Live without asking | `awatch` over the spec folders, debounced, pushed over a websocket; manual refresh exists only as a fallback. |
| VI. One command, one container, no internet | Multi-stage Dockerfile builds the frontend into the image; FastAPI serves it; no runtime fetches. |
| VII. Portfolio question first | The board is the landing view; detail is a drawer one click deep. |

No deviations. Nothing in this plan requires an exception.

## Project Structure

### Documentation (this feature)

```
specs/001-spec-kit-live-board/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── http-api.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```
backend/
├── requirements.txt
└── app/
    ├── main.py        # FastAPI app, websocket hub, watch loop, static serving
    ├── config.py      # environment-driven settings
    ├── models.py      # pydantic domain model
    ├── parsing.py     # markdown parsers for spec/plan/tasks/checklists
    └── scanner.py     # filesystem walk, stage derivation, git reads

frontend/
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx           # shell: header, filters, search, board
    ├── types.ts          # mirror of the backend model
    ├── useSnapshot.ts    # websocket transport, reconnect, change flashing
    ├── utils.ts
    └── components/
        ├── Board.tsx            # six stage columns
        ├── FeatureCard.tsx      # the card
        ├── FeatureDrawer.tsx    # overview / tasks / checklists / docs / git
        └── MarkdownView.tsx     # document rendering

Dockerfile              # node build stage → python runtime stage
docker-compose.yml      # one service, :ro mounts
```

**Structure Decision**: Two source trees, one image. The backend owns the domain model and
the frontend mirrors it in `types.ts` rather than generating a client — the model is small
enough that a generator would cost more than it saves, and the mirror is checked by the
compiler at build time.

## Complexity Tracking

Nothing here requires a constitutional exception. The one deliberate inefficiency is
worth naming: every change rebuilds the entire snapshot for every project rather than
re-parsing only what changed. At the scale in Technical Context a full scan is ~250 ms, and
incremental parsing would add a cache-invalidation problem in exchange for milliseconds
nobody would notice.

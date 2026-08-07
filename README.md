# SpecDash

A live, read-only board for every [spec-kit](https://github.com/github/spec-kit) project on
your disk.

Point it at the directory where you keep your repositories. It finds every spec-kit project
underneath, lays each feature out across the six stages of the pipeline — Specify, Clarify,
Plan, Tasks, Implement, Done — and follows the files as your agent writes them. It never
writes back.

```bash
cp .env.example .env      # set PROJECTS_ROOT
docker compose up -d
open http://localhost:8420
```

One image. One port. No configuration per project, no database, no internet.

Or without cloning anything, straight from the published image
([`ghcr.io/andrewkomkov/specdash`](https://github.com/andrewkomkov/specdash/pkgs/container/specdash),
amd64 + arm64, built and pushed by CI on every release):

```bash
docker run -d --name specdash -p 8420:8420 \
  -v "$HOME/projects:/projects:ro" \
  -e WATCHFILES_FORCE_POLLING=1 \
  ghcr.io/andrewkomkov/specdash:latest
```

## What it shows

**The board.** One column per pipeline stage, one card per feature, all projects at once.
A card carries the feature number and project, the title and summary, task progress, each
user story with its priority and completion, which documents exist, checklist completion,
open `[NEEDS CLARIFICATION]` markers, and how long ago the files changed. The feature named
by `.specify/feature.json` is marked `current`.

**Every card says why it is where it is.** `all 38 tasks ticked`, `plan.md present, no
tasks.md yet`, `2 open clarification marker(s)`. Placement is derived from the artefacts on
disk, and the artefacts outrank the prose: a spec that still says "ready for planning" over
a fully ticked `tasks.md` lands in Done, because a checkbox is a claim about code.

**Click a card** for the whole feature: user stories with their acceptance scenarios, the
task list grouped by phase or by story and filterable to the unfinished, the quality
checklists, every document rendered in place, and the git history that touched the feature
folder.

**It updates itself.** Run `/speckit-tasks` in one window with the board open in another:
progress moves, cards change column, and whatever just changed pulses.

**Read the board at two grains.** *Фичи* is one card per feature — the right density when
several projects are open at once. *Истории* is one card per user story, each placed by its
own ticked tasks rather than by its feature's, which is what you want when a handful of
features would otherwise leave the columns nearly empty. Setup, foundational and polish
tasks name no story, so they get a card of their own — without it the column totals would
quietly stop adding up. The choice is remembered between visits, and the header total
follows it: it counts the cards on screen, so it and the badge beside it always describe
the same set.

**Switch to Динамика** for movement rather than position: task completion per commit for
each project, read straight out of `git log` — no database, nothing stored. The dashed line
is the total, because work being added is half the story and a chart of percentages alone
hides it. Underneath, the feature folders no commit has touched in longest. A project that
is not under git says so plainly instead of showing an empty chart.

## Read-only, structurally

The projects you point it at are your real work. SpecDash treats them as someone else's:

- the code only ever opens files for reading — there is no write path, no cache file, no
  lock file, no "fixing" a malformed document;
- `docker-compose.yml` mounts every project path `:ro`, so the kernel refuses a write even
  if a future line of code asks for one;
- the container itself runs `read_only`, non-root, with `no-new-privileges`;
- git is limited to `log` and `rev-parse` with `--no-optional-locks`, so no `index.lock`
  can appear in your working tree while you are mid-rebase;
- every checkbox on screen is genuinely read-only. There is no drag-and-drop between
  columns, because moving a card would mean editing your files.

Verify it yourself:

```bash
docker compose exec specdash sh -c 'touch /projects/some-repo/specs/PROOF'
# touch: /projects/some-repo/specs/PROOF: Read-only file system
```

The page also loads nothing from the internet — no CDN, no fonts, no telemetry. Every asset
is inside the image.

## Configuration

All of it is optional except the first line.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROJECTS_ROOT` | *(required)* | host directory mounted read-only at `/projects` |
| `SPECDASH_PORT` | `8420` | host port |
| `SPECDASH_MAX_DEPTH` | `2` | how deep under the root to look for projects |
| `SPECDASH_POLLING` | `1` | poll for changes instead of using inotify — required on macOS and Windows, where bind mounts do not deliver inotify events |
| `SPECDASH_POLL_DELAY_MS` | `800` | polling interval |
| `SPECDASH_GIT` | `1` | read branch and history with git |
| `SPECDASH_HISTORY_COMMITS` | `200` | how far back the trend view walks |
| `SPECDASH_ROOTS` | `/projects` | scan roots inside the container |
| `SPECDASH_PROJECTS` | — | explicit project paths, instead of or alongside discovery |

A project is any directory holding `.specify/` or `specs/`. Adding one means creating it —
there is nothing to register, and it appears without a restart.

## Development

```bash
cd backend && pip install -r requirements-dev.txt
SPECDASH_ROOTS=$HOME/projects uvicorn app.main:app --reload --port 8420
python -m pytest                             # parsers, scanner, HTTP surface

cd frontend && npm install && npm run dev    # :5173, proxies /api and /ws
```

The backend suite is fixtures of the drift found in real spec-kit output — wrapped values,
`SC-005a`, checkboxes in sections that are not tasks, a `tasks.md` with no ids at all —
plus the properties most expensive to get wrong: that a spec's prose never outranks its
task list, that no `doc?file=` traversal escapes a project, and that a full scan leaves the
scanned tree byte for byte identical. Coverage of `backend/app/` is 100% and the gate is in
`pytest.ini`, so it is enforced by running the tests rather than by remembering to look.
That is a floor, not a claim of correctness — it says every line has been executed, not that
every behaviour is right.

The end-to-end suite drives the real application in a real browser:

```bash
cd frontend && npm run build          # the suite serves the built frontend
cd ../e2e && npm ci && npx playwright install chromium
npx playwright test
```

It starts the backend on a port of its own against a checked-in fixture workspace, and
covers the board, both grains and the remembered preference, search, the drawer's tabs, the
trend view including the project deliberately left outside git, and one live update — a
checkbox ticked on disk, waited on until the card changes column. Nothing is mocked: every
interesting failure this project has had was at the seam between the parser and the screen,
and a suite replaying a recorded snapshot would be blind to all of them.

Backend is FastAPI + pydantic + watchfiles; frontend is React 19 + Mantine 8 + Vite. The
domain model lives in `backend/app/models.py` and is mirrored in `frontend/src/types.ts`.
The HTTP and websocket surface is documented in
[`specs/001-spec-kit-live-board/contracts/http-api.md`](specs/001-spec-kit-live-board/contracts/http-api.md).

## It is a spec-kit project itself

SpecDash is specified the way it expects its subjects to be — see
[`specs/001-spec-kit-live-board/`](specs/001-spec-kit-live-board/) for the spec, plan,
research and task list, and [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
for the rules the code is held to. Point it at the folder containing this repository and it
will show you itself.

## Releasing

Conventional commits on `main` drive a rolling release-please pull request; merging it tags
the release, which is what builds and pushes the multi-arch image. The registry is ghcr, so
publishing authenticates with the workflow's own token and there is no long-lived registry
secret anywhere in this repository.

One manual step exists and only once, after the first push: the package starts private, and
has to be switched to public under **Packages → specdash → Package settings** for
`docker run ghcr.io/andrewkomkov/specdash:latest` to work without a login.

## Status

All five user stories are shipped: the board, the detail drawer, live updates, the
one-command read-only container, and progress over time from git history. Every task in
[`tasks.md`](specs/001-spec-kit-live-board/tasks.md) is ticked, and a checkbox there is a
claim about the code — the CI job in [`ci.yml`](.github/workflows/ci.yml) scans this
repository on every push and fails if the claim stops holding.

## Licence

MIT — see [LICENSE](LICENSE).

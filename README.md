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
([`andrewkomkov/specdash`](https://hub.docker.com/r/andrewkomkov/specdash), amd64 + arm64):

```bash
docker run -d --name specdash -p 8420:8420 \
  -v "$HOME/projects:/projects:ro" \
  -e WATCHFILES_FORCE_POLLING=1 \
  andrewkomkov/specdash:latest
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
| `SPECDASH_ROOTS` | `/projects` | scan roots inside the container |
| `SPECDASH_PROJECTS` | — | explicit project paths, instead of or alongside discovery |

A project is any directory holding `.specify/` or `specs/`. Adding one means creating it —
there is nothing to register, and it appears without a restart.

## Development

```bash
cd backend && pip install -r requirements.txt
SPECDASH_ROOTS=$HOME/projects uvicorn app.main:app --reload --port 8420

cd frontend && npm install && npm run dev    # :5173, proxies /api and /ws
```

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

## Status

User stories 1–4 are shipped: the board, the detail drawer, live updates, and the
one-command read-only container. US5 (progress over time from git history) and the parser
test suite are outstanding — they are listed as unticked tasks in
[`tasks.md`](specs/001-spec-kit-live-board/tasks.md) rather than quietly omitted.

## Licence

MIT — see [LICENSE](LICENSE).

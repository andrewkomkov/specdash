# Quickstart: running and verifying SpecDash

## Run it

```bash
cp .env.example .env
# set PROJECTS_ROOT to the directory that holds your repositories
docker compose up -d
open http://localhost:8420
```

That is the whole installation. Every directory under `PROJECTS_ROOT` (two levels deep by
default) holding `.specify/` or `specs/` appears on the board.

## Develop it

Two processes, because the frontend wants hot reload:

```bash
# backend
cd backend
pip install -r requirements.txt
SPECDASH_ROOTS=$HOME/PycharmProjects uvicorn app.main:app --reload --port 8420

# frontend (proxies /api and /ws to :8420)
cd frontend
npm install
npm run dev      # http://localhost:5173
```

## Verify it

### US1 — the board reflects the disk

1. Open the board. Every project directory holding spec-kit state is a chip in the header.
2. Pick a feature you know and count the ticked boxes in its `tasks.md` by hand:
   `grep -c '^- \[x\]' specs/NNN-slug/tasks.md`. The card must show the same number.
3. Find a feature with `plan.md` and no `tasks.md`. It must sit in **Plan** and say so.
4. Check the card marked `current` against `.specify/feature.json`.

### US2 — the drawer reads the feature

1. Open any card. Overview lists the user stories with priorities and acceptance scenarios.
2. Switch to **Задачи**: tasks are grouped by phase, regroupable by story, filterable to
   the unfinished. File paths named in a task appear as chips.
3. Switch to **Документы** and open `spec.md`. It renders with headings, tables and lists.
4. Open a feature whose spec has `[NEEDS CLARIFICATION]` markers — they appear as a red
   alert at the top of Overview.

### US3 — it is live

With the board open, in another window:

```bash
# any scanned project
sed -i '' 's/- \[ \] T0/- [x] T0/' specs/NNN-slug/tasks.md   # tick one task
```

Within a couple of seconds the card's progress moves and the card pulses. Tick the last
one and it changes column. Create a new `specs/999-test/spec.md` and a card appears without
a restart. `docker compose stop specdash` while the board is open: the header shows
`offline`; start it again and it returns to `live` on its own.

### US4 — it cannot write

The important verification. Run all three:

```bash
# 1. the mount refuses writes
docker compose exec specdash sh -c 'touch /projects/GreenPods/specs/PROOF 2>&1'
#    → Read-only file system

# 2. nothing changed during a session
find "$PROJECTS_ROOT" -path '*/specs/*' -type f -exec shasum {} + | shasum
#    run before and after a long session — the digests must match

# 3. no lock files left behind by the git reads
find "$PROJECTS_ROOT" -name 'index.lock'
#    → nothing
```

The page loading no external asset can be confirmed in the browser's network panel: every
request goes to `localhost:8420`.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROJECTS_ROOT` | *(required)* | host directory mounted read-only at `/projects` |
| `SPECDASH_PORT` | `8420` | host port |
| `SPECDASH_MAX_DEPTH` | `2` | how deep to search for projects |
| `SPECDASH_POLLING` | `1` | poll instead of inotify; required on macOS/Windows |
| `SPECDASH_POLL_DELAY_MS` | `800` | polling interval |
| `SPECDASH_GIT` | `1` | read branch and history with git |
| `SPECDASH_ROOTS` | `/projects` | scan roots inside the container |
| `SPECDASH_PROJECTS` | — | explicit project paths, instead of or alongside discovery |

## Troubleshooting

**The board is empty.** Check `docker compose exec specdash ls /projects` — if that is
empty, `PROJECTS_ROOT` is wrong. If the directories are there, they are deeper than
`SPECDASH_MAX_DEPTH`.

**Changes do not appear.** `SPECDASH_POLLING=0` on a macOS or Windows bind mount is the
usual cause: inotify events do not cross that boundary. Set it back to `1`.

**History is empty.** The project is not a git repository, or nothing has committed under
`specs/<feature>/` yet.

# Contract: HTTP and websocket surface

Served by the single container on port `8420`. Every endpoint is read-only; there is no
verb in this API that changes anything on disk. `POST /api/refresh` re-reads the disk — it
is a POST because it has a server-side effect on the cached snapshot, not on any file.

## GET /api/health

Liveness and configuration, used by the container healthcheck.

```json
{
  "ok": true,
  "projects": 4,
  "roots": ["/projects"],
  "watching": ["/projects/GreenPods/.specify", "/projects/GreenPods/specs"]
}
```

## GET /api/meta

Static presentation data: the title and the ordered stage list with labels.

## GET /api/snapshot

The full `Snapshot` (see [data-model.md](../data-model.md)). Scans on first call if no
snapshot exists yet. This is the fallback path for a browser whose websocket has not
connected; the websocket is the normal path.

## POST /api/refresh

Forces a rescan and broadcasts the result to every connected client.

```json
{ "ok": true, "generated_at": 1785000000.0, "scan_ms": 253 }
```

## GET /api/projects/{project_id}/features/{feature_id}/doc?file=...

Raw text of one document inside a feature folder. `file` is relative to the feature
directory (`spec.md`, `contracts/live-surface.md`, `checklists/requirements.md`).

Rules, all of which are security-relevant:

- the resolved path MUST stay inside the project directory — `../` escapes are refused
  with `400`;
- the feature MUST belong to the named project — otherwise `404`;
- documents above 2 MB are refused with `413`.

Response is `text/plain`; rendering is the browser's job.

## GET /api/projects/{project_id}/features/{feature_id}/commits

Git history touching `specs/{feature_id}`, newest first, at most 10 entries.

```json
{ "commits": [{ "sha": "a1b2c3d", "subject": "feat: ...", "author": "...", "date": "2026-08-06T...", "relative": "2 days ago" }] }
```

Empty list when the project is not a git repository or nothing has touched that path. Run
on demand only — never during a scan, because a git process per feature would dominate the
rescan that follows every save.

## GET /api/search?q=...&limit=30&kind=...

Ranked hits across everything the board knows — and, unlike the board's own filter, across
the *text* of the documents. The snapshot has never carried document bodies, so before this
endpoint existed nothing could find a sentence written inside a `spec.md`.

```json
{
  "query": "read-only guarantee",
  "total": 13,
  "took_ms": 2.92,
  "matched_by": "tokens",
  "suggestions": [],
  "hits": [
    {
      "kind": "document",
      "project_id": "specDash",
      "feature_id": "001-spec-kit-live-board",
      "ref": "plan.md",
      "file": "plan.md",
      "title": "Plan",
      "subtitle": "A live board for every spec-kit project on disk · specDash",
      "snippet": "…what makes the \u0002read-only guarantee\u0003 cheap to keep…",
      "score": 8.41
    }
  ]
}
```

- `kind` is one of `feature`, `story`, `task`, `requirement`, `checklist`, `document`. Passing
  an unknown one is a `400` rather than silently returning everything.
- `ref` identifies the thing inside its feature: a task id, a story id, a requirement id, or a
  document path. With `file` set, the drawer can open straight onto the document.
- `snippet` marks the match with `\u0002` and `\u0003` rather than with HTML, so the payload
  is never markup and the browser never has to sanitise it.
- `matched_by` says how it was found — `tokens` for the ranked index, `substring` for the
  trigram fallback, `none` when nothing matched. A card says why it sits where it does; a
  result says how it was reached.
- `suggestions` carries a corrected query when nothing matched and the words look mistyped.
  It corrects the terms rather than guessing a title, because a mistyped query is nothing
  like a whole sentence.
- `limit` is clamped to 100.

The index is SQLite FTS5, held **in memory**, rebuilt inside the same worker thread as every
rescan and swapped in with a single assignment — a search arriving mid-rescan is answered by
the previous index rather than by a half-built one. An index file would have been the first
thing SpecDash ever wrote to disk.

Query text is escaped, never interpolated: `read-only` is a thing to look for, and FTS5 reads
`-` as syntax.

## GET /api/projects/{project_id}/history

Task completion over time for a whole project, reconstructed from git. On demand only,
and cached against `HEAD`: walking history is far too expensive to do during the rescan
that follows every save.

```json
{
  "project_id": "GreenPods",
  "available": true,
  "reason": null,
  "commits_scanned": 24,
  "points": [
    {
      "sha": "9f1c0de…",
      "date": "2026-08-03T11:02:41+02:00",
      "subject": "feat: heart rate over the Apple protocol",
      "done": 128,
      "total": 128,
      "features": 2,
      "pct": 100
    }
  ],
  "stale": [
    {
      "feature_id": "003-heart-rate",
      "title": "Heart rate",
      "date": "2026-08-04T18:20:03+02:00",
      "days": 2,
      "subject": "docs: record the audit"
    }
  ]
}
```

- one `point` per commit that touched `specs/`, **oldest first**, counting every `tasks.md`
  as it stood at that revision with the same parser the board uses — a point and a card can
  never disagree about what a checkbox means;
- a revision holding no countable task is not a point, rather than a zero;
- `total` moves too. Work being added is the other half of the story, and a chart of
  percentages alone hides it;
- `stale` is the feature directories no commit has touched in longest, newest-commit date
  and age in days, limited to six and to features that still exist on disk;
- `available` is `false` — with a `reason` worth reading — whenever no series can honestly
  be drawn: the project is not a git repository, has no commits, nothing has touched
  `specs/`, no `tasks.md` was ever committed, or `SPECDASH_GIT=0`. The board states the
  reason instead of drawing an empty chart, because an empty chart reads as "no progress".

Numbers here are as of the last commit, so they differ from the board whenever something
is written but not yet committed. That is the point of the endpoint and not a defect.

`SPECDASH_HISTORY_COMMITS` (default 200) bounds the walk. Two `git cat-file` batches do the
whole thing regardless of length, and blobs are cached by object id, so the usual case —
one new commit — reparses one file.

## GET /api/projects/{project_id}/constitution

`text/plain` of `.specify/memory/constitution.md`, or `404` when the project has none.

## WS /ws

The live channel.

**Server → client**, on connect and after every rescan:

```json
{ "type": "snapshot", "reason": "changed: tasks.md", "snapshot": { ... } }
```

`reason` is human-readable and displayed in the header: `startup`, `connect`, `periodic`,
`manual`, `layout changed`, or `changed: <files>`.

**Client → server**: the text frames `ping` (answered with `{"type":"pong"}`) and
`refresh` (triggers a rescan and a broadcast). No other frame is accepted.

**Reconnection** is the client's responsibility: on close it retries every two seconds and
shows `offline` until it succeeds. A reconnect delivers a fresh snapshot, so no state has
to be replayed.

## Static

Everything not matching the above is served from the built frontend, falling back to
`index.html` so client-side routing works. All assets are local to the image; the page
requests nothing from the internet.

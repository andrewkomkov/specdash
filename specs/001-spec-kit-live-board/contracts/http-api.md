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

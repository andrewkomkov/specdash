"""SpecDash — a read-only, live dashboard for spec-kit projects."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from . import history, scanner
from .config import settings
from .models import STAGE_LABELS, STAGES, ProjectHistory, Snapshot

logging.basicConfig(
    level=os.getenv("SPECDASH_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("specdash")

WATCH_SUFFIXES = (".md", ".json", ".yaml", ".yml", ".txt")

# Above this, a document is refused rather than shipped to the browser: the point
# is to read a spec, and nothing spec-kit writes is anywhere near this big.
MAX_DOC_BYTES = 2_000_000


class Hub:
    """Fan-out of snapshots to every connected browser."""

    def __init__(self) -> None:
        self.clients: set[WebSocket] = set()
        self.snapshot: Snapshot | None = None
        self.lock = asyncio.Lock()

    async def rescan(self, reason: str) -> Snapshot:
        async with self.lock:
            snapshot = await asyncio.to_thread(
                scanner.scan_all,
                settings.roots,
                explicit=settings.projects,
                with_git=settings.with_git,
                max_depth=settings.max_depth,
            )
            self.snapshot = snapshot
        log.info(
            "scan (%s): %d project(s), %d feature(s) in %dms",
            reason,
            len(snapshot.projects),
            sum(len(p.features) for p in snapshot.projects),
            snapshot.scan_ms,
        )
        await self.broadcast(reason)
        return snapshot

    async def broadcast(self, reason: str) -> None:
        if not self.clients or self.snapshot is None:
            return
        payload = {
            "type": "snapshot",
            "reason": reason,
            "snapshot": self.snapshot.model_dump(),
        }
        dead: list[WebSocket] = []
        for ws in list(self.clients):
            try:
                await ws.send_json(payload)
            except (WebSocketDisconnect, RuntimeError):
                dead.append(ws)
        for ws in dead:
            self.clients.discard(ws)


hub = Hub()


def _watch_targets() -> list[str]:
    """Watch only the spec-kit folders, not whole project trees.

    Polling a repository with node_modules in it costs far more than polling the
    handful of markdown files that actually drive this dashboard.
    """
    targets: list[str] = []
    if hub.snapshot:
        for project in hub.snapshot.projects:
            for sub in (".specify", "specs"):
                path = Path(project.path) / sub
                if path.is_dir():
                    targets.append(str(path))
    return sorted(targets)


def _relevant(change: int, path: str) -> bool:
    name = os.path.basename(path)
    if name.startswith(".") and name != ".specify":
        return False
    return path.endswith(WATCH_SUFFIXES) or os.path.isdir(path)


async def _watch_loop() -> None:
    """Watch the spec folders; re-discover projects periodically for new ones."""
    from watchfiles import awatch

    force_polling = os.getenv("WATCHFILES_FORCE_POLLING", "1") not in ("0", "false", "no")
    poll_delay = int(float(os.getenv("SPECDASH_POLL_DELAY_MS", "800")))

    while True:
        targets = _watch_targets()
        if not targets:
            await asyncio.sleep(5)
            await hub.rescan("discover")
            continue
        log.info("watching %d path(s), polling=%s", len(targets), force_polling)
        try:
            async for changes in awatch(
                *targets,
                watch_filter=_relevant,
                force_polling=force_polling,
                poll_delay_ms=poll_delay,
                rust_timeout=20_000,
                yield_on_timeout=True,
                ignore_permission_denied=True,
            ):
                if changes:
                    # Editors write in bursts; let the burst finish before rescanning.
                    await asyncio.sleep(settings.debounce_ms / 1000)
                    changed = sorted({os.path.basename(p) for _, p in changes})[:3]
                    await hub.rescan("changed: " + ", ".join(changed))
                elif _watch_targets() != targets:
                    await hub.rescan("layout changed")
                    break  # restart awatch against the new set of folders
                else:
                    await hub.rescan("periodic")
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # a watcher crash must not take the server with it
            log.warning("watcher restarting after error: %s", exc)
            await asyncio.sleep(2)


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    await hub.rescan("startup")
    task = asyncio.create_task(_watch_loop())
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(
    title="SpecDash",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


@app.get("/api/health")
async def health() -> dict:
    return {
        "ok": True,
        "projects": len(hub.snapshot.projects) if hub.snapshot else 0,
        "roots": [str(r) for r in settings.roots],
        "watching": _watch_targets(),
    }


@app.get("/api/meta")
async def meta() -> dict:
    return {
        "title": settings.title,
        "stages": [{"id": s, "label": STAGE_LABELS[s]} for s in STAGES],
    }


@app.get("/api/snapshot")
async def snapshot() -> JSONResponse:
    if hub.snapshot is None:
        await hub.rescan("cold")
    assert hub.snapshot is not None
    return JSONResponse(hub.snapshot.model_dump())


@app.post("/api/refresh")
async def refresh() -> dict:
    snap = await hub.rescan("manual")
    return {"ok": True, "generated_at": snap.generated_at, "scan_ms": snap.scan_ms}


def _find_project(project_id: str):
    if hub.snapshot is None:
        raise HTTPException(503, "no snapshot yet")
    for project in hub.snapshot.projects:
        if project.id == project_id:
            return project
    raise HTTPException(404, f"unknown project {project_id!r}")


def _safe_path(project_path: str, relative: str) -> Path:
    """Resolve `relative` inside the project, refusing anything that escapes it."""
    root = Path(project_path).resolve()
    target = (root / relative).resolve()
    if not target.is_relative_to(root):
        raise HTTPException(400, "path escapes the project directory")
    if not target.is_file():
        raise HTTPException(404, f"no such file: {relative}")
    return target


@app.get("/api/projects/{project_id}/features/{feature_id}/doc")
async def feature_doc(project_id: str, feature_id: str, file: str) -> PlainTextResponse:
    project = _find_project(project_id)
    if not any(f.id == feature_id for f in project.features):
        raise HTTPException(404, f"unknown feature {feature_id!r}")
    path = _safe_path(project.path, f"specs/{feature_id}/{file}")
    if path.stat().st_size > MAX_DOC_BYTES:
        raise HTTPException(413, "document too large to display")
    return PlainTextResponse(path.read_text(encoding="utf-8", errors="replace"))


@app.get("/api/projects/{project_id}/features/{feature_id}/commits")
async def feature_commits(project_id: str, feature_id: str) -> dict:
    project = _find_project(project_id)
    commits = await asyncio.to_thread(
        scanner.feature_commits, Path(project.path), f"specs/{feature_id}"
    )
    return {"commits": [c.model_dump() for c in commits]}


@app.get("/api/projects/{project_id}/history")
async def project_history(project_id: str) -> dict:
    """Task completion per commit, plus the features gone quietest.

    On demand only, and cached against HEAD: walking history is far too expensive
    to do during the rescan that follows every save.
    """
    project = _find_project(project_id)
    if not settings.with_git:
        return ProjectHistory(
            project_id=project_id,
            reason="git reading is switched off (SPECDASH_GIT=0)",
        ).model_dump()
    result = await asyncio.to_thread(
        history.project_history,
        Path(project.path),
        project.id,
        limit=settings.history_commits,
        titles={f.id: f.title for f in project.features},
    )
    return result.model_dump()


@app.get("/api/projects/{project_id}/constitution")
async def constitution(project_id: str) -> PlainTextResponse:
    project = _find_project(project_id)
    if not project.constitution:
        raise HTTPException(404, "this project has no constitution.md")
    return PlainTextResponse(project.constitution)


@app.websocket("/ws")
async def websocket(ws: WebSocket) -> None:
    await ws.accept()
    hub.clients.add(ws)
    try:
        if hub.snapshot is not None:
            await ws.send_json(
                {"type": "snapshot", "reason": "connect", "snapshot": hub.snapshot.model_dump()}
            )
        while True:
            message = await ws.receive_text()
            if message == "ping":
                await ws.send_json({"type": "pong", "t": time.time()})
            elif message == "refresh":
                await hub.rescan("client request")
    except WebSocketDisconnect:
        pass
    finally:
        hub.clients.discard(ws)


# ---------------------------------------------------------------------------
# static frontend (built by the Docker image; absent during backend-only dev)
# ---------------------------------------------------------------------------

if settings.static_dir.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=settings.static_dir / "assets", check_dir=False),
        name="assets",
    )

    @app.get("/{path:path}")
    async def spa(path: str) -> FileResponse:
        candidate = settings.static_dir / path
        if path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(settings.static_dir / "index.html")

"""The service itself: the hub, the watch loop, the websocket and the routes.

These are the parts that ship in the image and had never been executed by a test.
"""

from __future__ import annotations

import asyncio
import sys
import types

import pytest
from conftest import WORKSPACE
from fastapi.testclient import TestClient

from app import main, scanner


@pytest.fixture
def snapshotted():
    """A hub holding a real snapshot, with no watcher and no lifespan."""
    main.hub.snapshot = scanner.scan_all([WORKSPACE], with_git=False)
    main.hub.clients.clear()
    yield main.hub
    main.hub.clients.clear()


@pytest.fixture
def client(snapshotted):
    return TestClient(main.app)


# --------------------------------------------------------------------------
# the hub
# --------------------------------------------------------------------------


def test_a_rescan_replaces_the_snapshot_and_reports_itself(monkeypatch, caplog):
    monkeypatch.setattr(main.settings, "roots", [WORKSPACE])
    monkeypatch.setattr(main.settings, "projects", [])
    monkeypatch.setattr(main.settings, "with_git", False)

    with caplog.at_level("INFO"):
        snapshot = asyncio.run(main.hub.rescan("test"))

    assert snapshot.projects
    assert main.hub.snapshot is snapshot
    assert "scan (test)" in caplog.text


def test_a_broadcast_with_no_clients_is_a_no_op(snapshotted):
    asyncio.run(main.hub.broadcast("nobody listening"))


def test_a_broadcast_before_the_first_scan_is_a_no_op():
    main.hub.snapshot = None
    main.hub.clients.add(object())  # type: ignore[arg-type]
    asyncio.run(main.hub.broadcast("too early"))
    main.hub.clients.clear()


def test_a_client_that_has_died_is_dropped_rather_than_retried(snapshotted):
    class Dead:
        async def send_json(self, payload):
            raise RuntimeError("socket is closed")

    class Alive:
        def __init__(self):
            self.received = []

        async def send_json(self, payload):
            self.received.append(payload)

    dead, alive = Dead(), Alive()
    main.hub.clients.update({dead, alive})  # type: ignore[arg-type]

    asyncio.run(main.hub.broadcast("changed: tasks.md"))

    assert dead not in main.hub.clients
    assert alive in main.hub.clients
    assert alive.received[0]["reason"] == "changed: tasks.md"


# --------------------------------------------------------------------------
# what gets watched
# --------------------------------------------------------------------------


def test_only_the_spec_folders_are_watched(snapshotted):
    targets = main._watch_targets()

    assert targets, "the fixture workspace has spec folders to watch"
    assert all(t.endswith(("/.specify", "/specs")) for t in targets)
    assert targets == sorted(targets)


def test_nothing_is_watched_before_the_first_scan():
    main.hub.snapshot = None
    assert main._watch_targets() == []


@pytest.mark.parametrize(
    "path, expected",
    [
        ("/p/specs/001/tasks.md", True),
        ("/p/.specify/feature.json", True),
        ("/p/specs/001/contracts/api.yaml", True),
        ("/p/specs/001/notes.txt", True),
        ("/p/specs/001/image.png", False),
        ("/p/specs/.hidden.md", False),
    ],
)
def test_the_watch_filter_keeps_documents_and_drops_the_rest(path, expected):
    assert main._relevant(1, path) is expected


def test_a_directory_is_always_relevant(tmp_path):
    assert main._relevant(1, str(tmp_path)) is True


# --------------------------------------------------------------------------
# the watch loop
# --------------------------------------------------------------------------


class _Watcher:
    """Stands in for `awatch`: yields a scripted sequence, then raises."""

    def __init__(self, script):
        self.script = list(script)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self.script:
            raise StopAsyncIteration
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _fake_watchfiles(monkeypatch, scripts):
    """Install a fake `watchfiles` module handing out one script per call."""
    calls = {"n": 0}

    def awatch(*targets, **kwargs):
        index = min(calls["n"], len(scripts) - 1)
        calls["n"] += 1
        return _Watcher(scripts[index])

    module = types.ModuleType("watchfiles")
    module.awatch = awatch  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "watchfiles", module)
    return calls


def test_the_loop_rescans_on_a_change_and_on_a_timeout(monkeypatch, snapshotted, caplog):
    reasons: list[str] = []

    async def record(reason):
        reasons.append(reason)
        if len(reasons) >= 2:
            raise asyncio.CancelledError

    monkeypatch.setattr(main.hub, "rescan", record)
    monkeypatch.setattr(main.settings, "debounce_ms", 0)
    _fake_watchfiles(monkeypatch, [[{(1, "/p/specs/001/tasks.md")}, set()]])

    with pytest.raises(asyncio.CancelledError):
        asyncio.run(main._watch_loop())

    assert reasons[0] == "changed: tasks.md"
    assert reasons[1] == "periodic"


def test_the_loop_restarts_when_the_set_of_watched_folders_changes(monkeypatch, snapshotted):
    reasons: list[str] = []
    # The loop reads the targets once at the top and again on a timeout; the
    # second read differing is what tells it the layout moved.
    targets = [["/a"], ["/b"]]

    monkeypatch.setattr(main, "_watch_targets", lambda: targets.pop(0) if targets else ["/b"])

    async def record(reason):
        reasons.append(reason)
        # Let the first rescan through so the loop reaches its `break` and
        # restarts awatch; only then stop it.
        if len(reasons) >= 2:
            raise asyncio.CancelledError

    monkeypatch.setattr(main.hub, "rescan", record)
    _fake_watchfiles(monkeypatch, [[set()], [set()]])

    with pytest.raises(asyncio.CancelledError):
        asyncio.run(main._watch_loop())

    assert reasons[0] == "layout changed"


def test_the_loop_survives_a_watcher_that_raises(monkeypatch, snapshotted, caplog):
    """A watcher crash must not take the server down with it."""
    sleeps: list[float] = []
    calls = _fake_watchfiles(monkeypatch, [[RuntimeError("inotify exploded")], [set()]])

    async def fake_sleep(seconds):
        sleeps.append(seconds)
        if len(sleeps) >= 1:
            raise asyncio.CancelledError

    monkeypatch.setattr(main.asyncio, "sleep", fake_sleep)

    with caplog.at_level("WARNING"), pytest.raises(asyncio.CancelledError):
        asyncio.run(main._watch_loop())

    assert "watcher restarting after error" in caplog.text
    assert calls["n"] == 1


def test_the_loop_waits_and_rediscovers_when_there_is_nothing_to_watch(monkeypatch):
    monkeypatch.setattr(main, "_watch_targets", lambda: [])
    _fake_watchfiles(monkeypatch, [[set()]])

    async def fake_sleep(seconds):
        return None

    monkeypatch.setattr(main.asyncio, "sleep", fake_sleep)

    seen: list[str] = []

    async def record(reason):
        seen.append(reason)
        # The first pass must return so the loop hits its `continue` and tries
        # to find targets again; the second ends the test.
        if len(seen) >= 2:
            raise asyncio.CancelledError

    monkeypatch.setattr(main.hub, "rescan", record)

    with pytest.raises(asyncio.CancelledError):
        asyncio.run(main._watch_loop())

    assert seen == ["discover", "discover"]


def test_the_lifespan_scans_once_and_cancels_the_watcher_on_the_way_out(monkeypatch):
    started: list[str] = []

    async def record(reason):
        started.append(reason)

    async def forever():
        await asyncio.Event().wait()

    monkeypatch.setattr(main.hub, "rescan", record)
    monkeypatch.setattr(main, "_watch_loop", forever)

    async def run():
        async with main.lifespan(main.app):
            pass

    asyncio.run(run())
    assert started == ["startup"]


# --------------------------------------------------------------------------
# routes
# --------------------------------------------------------------------------


def test_health_reports_what_is_being_watched(client):
    body = client.get("/api/health").json()

    assert body["ok"] is True
    assert body["projects"] >= 1
    assert isinstance(body["watching"], list)


def test_meta_lists_the_stages_in_order(client):
    body = client.get("/api/meta").json()

    assert [s["id"] for s in body["stages"]] == [
        "specify",
        "clarify",
        "plan",
        "tasks",
        "implement",
        "done",
    ]
    assert body["title"]


def test_a_cold_snapshot_is_scanned_on_demand(monkeypatch):
    monkeypatch.setattr(main.settings, "roots", [WORKSPACE])
    monkeypatch.setattr(main.settings, "projects", [])
    monkeypatch.setattr(main.settings, "with_git", False)
    main.hub.snapshot = None

    body = TestClient(main.app).get("/api/snapshot").json()

    assert body["projects"]


def test_refresh_rescans_and_reports_how_long_it_took(client, monkeypatch):
    monkeypatch.setattr(main.settings, "roots", [WORKSPACE])
    monkeypatch.setattr(main.settings, "projects", [])
    monkeypatch.setattr(main.settings, "with_git", False)

    body = client.post("/api/refresh").json()

    assert body["ok"] is True
    assert body["scan_ms"] >= 0


def test_a_request_before_the_first_scan_is_a_503():
    main.hub.snapshot = None
    response = TestClient(main.app).get("/api/projects/demo/history")

    assert response.status_code == 503


def test_an_unknown_project_is_a_404(client):
    assert client.get("/api/projects/nope/constitution").status_code == 404


def test_a_project_without_a_constitution_is_a_404(client, monkeypatch):
    project = main.hub.snapshot.projects[0]
    monkeypatch.setattr(project, "constitution", None)

    assert client.get(f"/api/projects/{project.id}/constitution").status_code == 404


def test_a_document_over_the_size_limit_is_refused(client, monkeypatch):
    """Lowering the ceiling beats writing a two-megabyte fixture into the repo."""
    monkeypatch.setattr(main, "MAX_DOC_BYTES", 10)
    response = client.get(
        "/api/projects/demo/features/001-contradicting-status/doc", params={"file": "tasks.md"}
    )

    assert response.status_code == 413


def test_commits_are_served_on_demand(client):
    """The fixture workspace lives inside this repository, so git finds the
    enclosing one and answers honestly — which is the behaviour a user gets when
    their project is a subdirectory of a larger checkout."""
    body = client.get("/api/projects/demo/features/001-contradicting-status/commits").json()

    assert isinstance(body["commits"], list)
    for commit in body["commits"]:
        assert set(commit) == {"sha", "subject", "author", "date", "relative"}


def test_history_says_so_when_git_reading_is_switched_off(client, monkeypatch):
    monkeypatch.setattr(main.settings, "with_git", False)

    body = client.get("/api/projects/demo/history").json()

    assert body["available"] is False
    assert "SPECDASH_GIT=0" in body["reason"]


# --------------------------------------------------------------------------
# the websocket
# --------------------------------------------------------------------------


def test_a_client_gets_a_snapshot_on_connect_and_answers_to_ping(client):
    with client.websocket_connect("/ws") as ws:
        first = ws.receive_json()
        assert first["type"] == "snapshot"
        assert first["reason"] == "connect"

        ws.send_text("ping")
        assert ws.receive_json()["type"] == "pong"


def test_a_client_can_ask_for_a_rescan(client, monkeypatch):
    monkeypatch.setattr(main.settings, "roots", [WORKSPACE])
    monkeypatch.setattr(main.settings, "projects", [])
    monkeypatch.setattr(main.settings, "with_git", False)

    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_text("refresh")
        assert ws.receive_json()["reason"] == "client request"


def test_an_unknown_frame_is_ignored_rather_than_answered(client):
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_text("delete everything")
        ws.send_text("ping")
        assert ws.receive_json()["type"] == "pong"


def test_a_client_connecting_before_the_first_scan_is_not_sent_one():
    main.hub.snapshot = None
    with TestClient(main.app).websocket_connect("/ws") as ws:
        ws.send_text("ping")
        assert ws.receive_json()["type"] == "pong"


def test_a_disconnected_client_is_forgotten(client):
    with client.websocket_connect("/ws") as ws:
        ws.receive_json()
    assert main.hub.clients == set()

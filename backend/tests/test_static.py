"""The built frontend, served by the same process on the same port.

This block only exists when a static directory is present, which is true in the
image and false during backend development — so exercising it means importing the
module with one there. It runs last, and puts the module back as it found it.
"""

from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def served(tmp_path, monkeypatch):
    static = tmp_path / "static"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text("<div id=\"root\"></div>", encoding="utf-8")
    (static / "assets" / "index.js").write_text("console.log('built')", encoding="utf-8")
    (static / "favicon.ico").write_text("not really an icon", encoding="utf-8")

    monkeypatch.setenv("SPECDASH_STATIC", str(static))

    from app import config, main

    importlib.reload(config)
    reloaded = importlib.reload(main)
    reloaded.hub.snapshot = None
    yield TestClient(reloaded.app)

    # Put the module back: the rest of the suite imports these by name.
    monkeypatch.undo()
    importlib.reload(config)
    importlib.reload(main)


def test_the_root_serves_the_built_index(served):
    response = served.get("/")

    assert response.status_code == 200
    assert 'id="root"' in response.text


def test_a_built_asset_is_served_from_disk(served):
    response = served.get("/favicon.ico")

    assert response.status_code == 200
    assert "not really an icon" in response.text


def test_an_unknown_path_falls_back_to_the_index(served):
    """Client-side routing needs every unmatched path to return the shell."""
    response = served.get("/some/deep/client/route")

    assert response.status_code == 200
    assert 'id="root"' in response.text


def test_the_api_still_wins_over_the_fallback(served):
    response = served.get("/api/meta")

    assert response.status_code == 200
    assert "stages" in response.json()

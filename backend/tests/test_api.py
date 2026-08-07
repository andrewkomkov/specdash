"""The HTTP surface, in particular the parts that are security-relevant."""

from __future__ import annotations

import pytest
from conftest import WORKSPACE
from fastapi.testclient import TestClient

from app import main, scanner


@pytest.fixture(scope="module")
def client():
    # Set the snapshot directly rather than entering the lifespan: the tests are
    # about the endpoints, not about the watcher or a scan of the whole machine.
    main.hub.snapshot = scanner.scan_all([WORKSPACE], with_git=False)
    return TestClient(main.app)


DOC = "/api/projects/demo/features/001-contradicting-status/doc"


def test_a_document_inside_the_feature_is_served(client):
    response = client.get(DOC, params={"file": "tasks.md"})

    assert response.status_code == 200
    assert "T001 Create the package" in response.text


@pytest.mark.parametrize(
    "escape",
    [
        "../../etc/passwd",
        "../../../etc/passwd",
        "../../../../../../etc/passwd",
        "/etc/passwd",
        "specs/../../../etc/passwd",
        "..%2f..%2f..%2fetc%2fpasswd",
        "../../../../../../../../etc/hosts",
    ],
)
def test_no_traversal_attempt_serves_a_file_from_outside_the_project(client, escape):
    """The property that matters is not which status code comes back, it is that
    nothing outside the project directory is ever served."""
    response = client.get(DOC, params={"file": escape})

    assert response.status_code in (400, 404), response.text
    assert "root:" not in response.text


def test_a_path_that_resolves_outside_the_project_is_refused_by_resolution(client):
    """Refusal is by resolving the path and comparing, not by pattern matching:
    `..` inside the project is harmless, `..` past its root is not."""
    response = client.get(DOC, params={"file": "../../../etc/passwd"})

    assert response.status_code == 400
    assert "escapes the project" in response.json()["detail"]


def test_a_missing_document_is_a_404_not_a_500(client):
    response = client.get(DOC, params={"file": "nope.md"})

    assert response.status_code == 404


def test_a_feature_from_another_project_is_refused(client):
    response = client.get("/api/projects/demo/features/999-invented/doc", params={"file": "spec.md"})

    assert response.status_code == 404


def test_snapshot_and_health_agree_with_the_scan(client):
    snapshot = client.get("/api/snapshot").json()
    health = client.get("/api/health").json()

    assert health["ok"] is True
    assert health["projects"] == len(snapshot["projects"]) == 1
    assert {f["id"] for f in snapshot["projects"][0]["features"]} == {
        "001-contradicting-status",
        "002-planned-only",
    }


def test_history_says_plainly_that_a_project_without_git_has_none(client):
    """An empty chart reads as "no progress made". The board must be told the
    difference between no history and no movement."""
    body = client.get("/api/projects/demo/history").json()

    assert body["available"] is False
    assert body["reason"] == "this project is not a git repository"
    assert body["points"] == []


def test_history_of_an_unknown_project_is_a_404(client):
    assert client.get("/api/projects/nope/history").status_code == 404

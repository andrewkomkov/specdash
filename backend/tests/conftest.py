from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

# The package is `app`, rooted at backend/, so tests run from anywhere.
BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

FIXTURES = Path(__file__).resolve().parent / "fixtures"
DRIFT = FIXTURES / "drift"
WORKSPACE = FIXTURES / "workspace"
DEMO = WORKSPACE / "demo"


def read(name: str) -> str:
    return (DRIFT / name).read_text(encoding="utf-8")


def _git(cwd: Path, *args: str) -> None:
    env = {
        **os.environ,
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_CONFIG_SYSTEM": os.devnull,
        "GIT_AUTHOR_NAME": "SpecDash Tests",
        "GIT_AUTHOR_EMAIL": "tests@specdash.invalid",
        "GIT_COMMITTER_NAME": "SpecDash Tests",
        "GIT_COMMITTER_EMAIL": "tests@specdash.invalid",
    }
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, env=env)


@pytest.fixture(scope="session")
def repo(tmp_path_factory) -> Path:
    """A real git repository with a real history.

    Mocking `subprocess` here would test the mock. The entire point of the
    history walk is that it parses what git actually prints — the format strings,
    the `cat-file` batch framing, the missing-object lines.
    """
    root = tmp_path_factory.mktemp("repo")
    feature = root / "specs" / "001-walked-history"
    feature.mkdir(parents=True)
    (feature / "spec.md").write_text(
        "# Feature Specification: Walked history\n\n**Status**: In progress\n", encoding="utf-8"
    )

    _git(root, "init", "--initial-branch=main")

    revisions = [
        "# Tasks\n\n## Phase 1: Setup\n\n- [ ] T001 one\n- [ ] T002 two\n",
        "# Tasks\n\n## Phase 1: Setup\n\n- [x] T001 one\n- [ ] T002 two\n",
        "# Tasks\n\n## Phase 1: Setup\n\n- [x] T001 one\n- [x] T002 two\n- [ ] T003 three\n",
    ]
    for index, body in enumerate(revisions, start=1):
        (feature / "tasks.md").write_text(body, encoding="utf-8")
        _git(root, "add", "-A")
        _git(
            root,
            "-c",
            "commit.gpgsign=false",
            "commit",
            "--no-verify",
            "-m",
            f"feat: revision {index}",
            "--date",
            f"2026-01-0{index}T10:00:00+00:00",
        )
    return root


@pytest.fixture(autouse=True)
def _clear_history_caches():
    """The history module caches on HEAD and on blob ids, both of which are
    stable within a session — so a test that expects a cold walk must say so."""
    from app import history

    history._series_cache.clear()
    history._blob_cache.clear()
    yield


@pytest.fixture(scope="session")
def demo_snapshot():
    from app import scanner

    return scanner.scan_all([WORKSPACE], with_git=False)


@pytest.fixture(scope="session")
def demo_project(demo_snapshot):
    return next(p for p in demo_snapshot.projects if p.id == "demo")

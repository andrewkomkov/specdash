from __future__ import annotations

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


@pytest.fixture(scope="session")
def demo_snapshot():
    from app import scanner

    return scanner.scan_all([WORKSPACE], with_git=False)


@pytest.fixture(scope="session")
def demo_project(demo_snapshot):
    return next(p for p in demo_snapshot.projects if p.id == "demo")

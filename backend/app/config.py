from __future__ import annotations

import os
from pathlib import Path


def _paths(value: str | None) -> list[Path]:
    if not value:
        return []
    return [Path(p.strip()) for p in value.replace(";", ",").split(",") if p.strip()]


class Settings:
    """Environment-driven configuration. All paths are read-only inputs."""

    def __init__(self) -> None:
        self.roots: list[Path] = _paths(os.getenv("SPECDASH_ROOTS", "/projects"))
        self.projects: list[Path] = _paths(os.getenv("SPECDASH_PROJECTS"))
        self.max_depth: int = int(os.getenv("SPECDASH_MAX_DEPTH", "2"))
        self.with_git: bool = os.getenv("SPECDASH_GIT", "1") not in ("0", "false", "no")
        self.debounce_ms: int = int(os.getenv("SPECDASH_DEBOUNCE_MS", "400"))
        self.poll_seconds: float = float(os.getenv("SPECDASH_POLL_SECONDS", "0"))
        self.history_commits: int = int(os.getenv("SPECDASH_HISTORY_COMMITS", "200"))
        self.static_dir: Path = Path(os.getenv("SPECDASH_STATIC", "/app/static"))
        self.title: str = os.getenv("SPECDASH_TITLE", "SpecDash")


settings = Settings()

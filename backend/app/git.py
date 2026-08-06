"""Every git call SpecDash makes, in one place.

Read-only by construction. The allow-list below is the enforcement point for the
first principle — a subcommand that could touch the working tree cannot be run
from this process at all — and `--no-optional-locks` keeps an `index.lock` from
appearing in a user's repository while they are mid-rebase.
"""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path

log = logging.getLogger("specdash.git")

READ_ONLY_SUBCOMMANDS = frozenset({"log", "rev-parse", "ls-tree", "cat-file"})

BASE = ["git", "--no-optional-locks", "-c", "core.quotePath=false"]


def _argv(args: tuple[str, ...]) -> list[str]:
    if not args or args[0] not in READ_ONLY_SUBCOMMANDS:
        raise ValueError(f"not a read-only git subcommand: {args[:1]}")
    return [*BASE, *args]


def run(cwd: Path, *args: str, timeout: float = 5) -> str | None:
    """Stdout of a read-only git command, or `None` if it could not be run."""
    try:
        out = subprocess.run(
            _argv(args), cwd=cwd, capture_output=True, text=True, timeout=timeout, check=False
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        log.debug("git %s failed in %s: %s", args[0], cwd, out.stderr.strip()[:200])
        return None
    return out.stdout.strip()


def run_bytes(cwd: Path, *args: str, stdin: bytes = b"", timeout: float = 30) -> bytes | None:
    """Raw stdout, for `cat-file` batches whose payload is not text."""
    try:
        out = subprocess.run(
            _argv(args), cwd=cwd, input=stdin, capture_output=True, timeout=timeout, check=False
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    return out.stdout


def is_repo(path: Path) -> bool:
    return (path / ".git").exists() and run(path, "rev-parse", "--git-dir") is not None


def head(path: Path) -> str | None:
    return run(path, "rev-parse", "HEAD")

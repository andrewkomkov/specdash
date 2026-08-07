"""The git module, whose whole job is to be read-only and to survive failure."""

from __future__ import annotations

import subprocess

import pytest

from app import git


def test_a_subcommand_that_is_not_read_only_is_refused():
    """The allow-list is the enforcement point for the first principle, not a
    comment about intent. It must refuse before a process is ever started."""
    for forbidden in ("commit", "checkout", "gc", "push", "reset"):
        with pytest.raises(ValueError, match="not a read-only git subcommand"):
            git._argv((forbidden,))


def test_an_empty_invocation_is_refused(tmp_path):
    with pytest.raises(ValueError):
        git.run(tmp_path)
    with pytest.raises(ValueError):
        git.run_bytes(tmp_path)


def test_every_invocation_carries_the_no_lock_flags():
    argv = git._argv(("log", "-1"))

    assert argv[:4] == ["git", "--no-optional-locks", "-c", "core.quotePath=false"]
    assert argv[-2:] == ["log", "-1"]


def test_a_directory_that_is_not_a_repository_reads_as_one(tmp_path):
    assert git.is_repo(tmp_path) is False
    assert git.head(tmp_path) is None


def test_a_failing_command_returns_none_rather_than_raising(repo):
    assert git.run(repo, "rev-parse", "--verify", "nope-no-such-ref") is None


def test_a_command_that_cannot_start_returns_none(tmp_path, monkeypatch):
    def explode(*args, **kwargs):
        raise OSError("git is not installed")

    monkeypatch.setattr(subprocess, "run", explode)
    assert git.run(tmp_path, "log") is None
    assert git.run_bytes(tmp_path, "cat-file", "--batch-check") is None


def test_a_command_that_times_out_returns_none(tmp_path, monkeypatch):
    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd="git", timeout=5)

    monkeypatch.setattr(subprocess, "run", timeout)
    assert git.run(tmp_path, "log") is None
    assert git.run_bytes(tmp_path, "cat-file", "--batch") is None


def test_bytes_are_returned_unstripped(repo):
    raw = git.run_bytes(repo, "cat-file", "--batch-check", stdin=b"HEAD\n")

    assert raw is not None
    assert raw.endswith(b"\n"), "stripping would corrupt a cat-file batch payload"


def test_a_failing_bytes_command_returns_none(repo):
    assert git.run_bytes(repo, "cat-file", "--batch-check", stdin=b"nope-no-such-object\n") is not None
    assert git.run_bytes(repo, "ls-tree", "nope-no-such-ref") is None


def test_a_real_repository_reports_its_head(repo):
    assert git.is_repo(repo) is True
    head = git.head(repo)
    assert head is not None and len(head) == 40

---
description: "Task list for ordering the history series by date"
---

# Tasks: A series that reads forward

**Input**: Design documents from `/specs/010-a-series-that-reads-forward/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Ticked against the code on 2026-08-14.** T002 was the task that mattered: before the fix went in,
the new fixture was run against the old `points.reverse()` and both ordering tests failed. A test
that passes before and after proves nothing about the bug it names.

## Phase 1: User Story 1 — The trend reads left to right, whatever git did (Priority: P1)

- [x] T001 [US1] A repository fixture whose author dates run counter to its commit order, built
      with `git commit --date` — the knob a rebase turns
- [x] T002 [US1] Assert the fixture reproduces the failure: unsorted, the dates are not ascending
- [x] T003 [US1] Replace `points.reverse()` with a stable sort on the parsed date (FR-001, FR-002)
- [x] T004 [US1] Compare as datetimes rather than strings, so mixed offsets order by instant
- [x] T005 [US1] An unparseable date must not raise during the sort
- [x] T006 [US1] Assert the last point is the most recent, since the card reports it (FR-003)
- [x] T007 [US1] Assert an already-ordered repository is unchanged (FR-004)

## Phase 2: Verification

- [x] T008 `pytest` at the 100% gate and `ruff check`
- [x] T009 The CI scan-this-repository step against the branch that exposed this
- [x] T010 The Trend view over the author's real root

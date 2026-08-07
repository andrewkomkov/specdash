# Feature Specification: A test harness worth trusting

**Feature Branch**: `004-a-test-harness-worth-trusting`

**Created**: 2026-08-07

**Status**: Implemented

**Input**: User description: "e2e полноценный на playwright сделай" / "Покрой остальной код на 100%"

## Overview

SpecDash is tested from one side only. 42 pytest cases cover the parsers and the scanner
well, but measured coverage is **72%**: `history.py` is at 17%, `git.py` at 41%, `main.py`
at 49%. The whole frontend — the board, both grains, the drawer, the trend view, the live
socket — has no automated test of any kind. Every claim made about the screen in this
repository so far rests on someone having looked at it.

That is the wrong shape for a tool whose own constitution says a checkbox is a claim about
code. This feature closes both gaps: a Playwright suite that drives the real application in
a real browser, and backend coverage taken to 100% with the gate enforced in CI so it
cannot quietly slide back.

**What 100% does and does not mean.** It is line coverage of `backend/app/`, enforced by
`--cov-fail-under=100`. It means every line has been executed by a test, not that every
behaviour is correct — a number that can be reached by exercising code without asserting
anything. It is worth having as a floor precisely because the gaps it exposed here are real
ones: the entire git history walk, the websocket, the watch loop and the SPA fallback have
never run under test. Where reaching a line would require asserting nothing meaningful, the
line is excluded explicitly and the exclusion is justified in the file, rather than padded
with a test that exists to move a number.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prove the board works without opening it (Priority: P1)

Someone changing the scanner, the parser or a component wants to know they have not broken
the screen. Today the only way to find out is to build the image, mount some projects and
look — which is why the drawer, the trend view and the live socket have each been verified
by hand exactly once.

**Why this priority**: This is the request, and it is the only part of the system with no
automated coverage at all.

**Independent Test**: Run the Playwright suite against a fixture workspace and watch it
exercise the board end to end without a human looking at anything.

**Acceptance Scenarios**:

1. **Given** a fixture workspace of spec-kit projects, **When** the suite runs, **Then**
   every feature appears in the column its files justify, with the counts the fixture
   implies.
2. **Given** the board, **When** the grain is switched to stories and the page is reloaded,
   **Then** the board comes back at story grain — the preference is proven to persist in a
   real browser, which is the only place `localStorage` behaves like `localStorage`.
3. **Given** a story card, **When** it is clicked, **Then** the drawer opens on that
   feature with that story expanded.
4. **Given** a search term, **When** it is typed, **Then** the board narrows and the header
   total and badge follow the grain.
5. **Given** the trend view, **When** a project is not a git repository, **Then** the card
   says history is unavailable rather than drawing an empty chart.
6. **Given** an open board, **When** a `tasks.md` in the fixture changes on disk, **Then**
   the card moves without a reload — the live path, proven rather than asserted.

### User Story 2 - Every line of the backend has been run (Priority: P1)

The git history walk, the websocket hub, the watch loop and the static fallback are shipped
in the image and have never executed under test. A refactor of any of them today would be
caught by nothing.

**Why this priority**: Equal to US1 — it is the same request from the other side, and the
uncovered code includes the newest and least exercised parts of the system.

**Independent Test**: `pytest --cov=app --cov-fail-under=100` passes.

**Acceptance Scenarios**:

1. **Given** the suite, **When** coverage is measured over `backend/app/`, **Then** it is
   100% and the run fails below that.
2. **Given** a real git repository built by the fixture, **When** the history walk runs,
   **Then** the series it returns matches the commits the fixture made.
3. **Given** a websocket client, **When** it connects and sends `ping` and `refresh`,
   **Then** it receives a snapshot, a pong, and a rebroadcast.
4. **Given** a scan whose watcher raises, **When** the loop runs, **Then** it logs and
   restarts rather than taking the server down.

### User Story 3 - The gates hold on someone else's machine (Priority: P2)

A suite that only runs locally is a suite that rots. Both gates belong in CI, on the same
push that already checks the scan and the read-only mount.

**Why this priority**: Without it the other two stories decay to a snapshot in time.

**Independent Test**: Push a branch and watch CI run both suites and fail on either.

**Acceptance Scenarios**:

1. **Given** a pull request, **When** CI runs, **Then** the Playwright suite runs against
   the built application and the coverage gate is enforced.
2. **Given** a failing E2E assertion, **When** CI runs, **Then** the build fails and the
   trace is retrievable as an artefact.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The E2E suite MUST drive the real application — the FastAPI process serving
  the built frontend — not a mocked API.
- **FR-002**: The E2E fixture workspace MUST be checked in and deterministic, so a failure
  means the code changed and never that someone's projects did.
- **FR-003**: The E2E suite MUST NOT write into the fixture workspace except where a test
  is specifically exercising the live-reload path, and MUST restore what it changed.
- **FR-004**: The suite MUST cover both grains, the persisted preference, search, the
  drawer's tabs, the trend view including the unavailable case, and one live update.
- **FR-005**: Backend line coverage MUST be 100%, enforced by the test runner rather than
  by a reviewer remembering.
- **FR-006**: Any line excluded from coverage MUST carry a written reason at the exclusion
  site.
- **FR-007**: The history walk MUST be tested against a real git repository created by the
  fixture, not a mocked `subprocess`.
- **FR-008**: Both suites MUST run in CI on every push and pull request, and the E2E suite
  MUST publish its trace on failure.
- **FR-009**: Neither suite may become a reason to write into a scanned project — the
  fixture workspace is the test's own, not a user's.

## Success Criteria *(mandatory)*

- **SC-001**: `pytest --cov=app --cov-fail-under=100` passes from a clean checkout.
- **SC-002**: The Playwright suite covers all six US1 scenarios and passes headless.
- **SC-003**: A deliberate regression — a card placed in the wrong column, a broken grain
  switch, a dead socket — is caught by the suite rather than by a person.
- **SC-004**: CI fails when either gate fails.
- **SC-005**: The whole suite runs in under three minutes on CI.

## Edge Cases

- Playwright's browsers are a large download: CI must cache or install only the browser the
  suite uses.
- The live-update test races the watcher's debounce; it must wait on the board rather than
  on a timer.
- A test that starts the backend must pick a free port, so a developer with the container
  already running on 8420 is not broken by it.
- Coverage of the `__main__`-style startup paths must not require actually starting uvicorn.

# Implementation Plan: A test harness worth trusting

**Branch**: `004-a-test-harness-worth-trusting` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-a-test-harness-worth-trusting/spec.md`

## Summary

Two suites, one fixture idea. `e2e/` holds a Playwright project that starts the backend
against a checked-in workspace of spec-kit projects and drives the built frontend in
Chromium. `backend/tests/` grows the cases that reach the code nobody has executed —
the git walk against a real repository the fixture builds, the websocket, the watch loop,
the static fallback — and the coverage gate moves into `pytest.ini` so it is enforced by
running the tests rather than by remembering to look.

## Technical Context

**Language/Version**: Python 3.13 (backend and its tests), TypeScript 5.8 (E2E)

**Primary Dependencies**: `pytest-cov` added to `backend/requirements-dev.txt`;
`@playwright/test` added to the frontend's dev dependencies. Nothing is added to the
runtime image — `.dockerignore` already excludes tests, and `e2e/` joins it.

**Storage**: none. The E2E fixture workspace is a checked-in directory of markdown; the git
fixture for the history walk is built in a temporary directory per test session and thrown
away.

**Testing**: this is the feature.

**Target Platform**: unchanged.

**Performance Goals**: the whole suite under three minutes on CI, which rules out starting
a container per test — one backend process serves the whole Playwright run.

## Why the E2E suite drives the real backend

Mocking `/api/snapshot` would make the suite faster and would test nothing worth testing.
The interesting failures in this application are precisely at the seam: a parser change
that shifts a card between columns, a model field that stops being serialised, a websocket
frame the client no longer understands. A suite that replays a recorded snapshot is blind
to all three.

So `playwright.config.ts` uses `webServer` to start uvicorn with
`SPECDASH_ROOTS` pointed at `e2e/fixtures/workspace` and `SPECDASH_STATIC` at the built
frontend, on a port of its own. Every assertion runs against real parsing of real files.

## The fixture workspace

Checked in under `e2e/fixtures/workspace/`, holding three small projects chosen to put a
card in more than one column and to exercise the awkward cases:

- a project with a feature in every interesting stage — spec only, plan but no tasks, tasks
  half done, tasks all done;
- a project whose feature has stories with uneven progress plus tasks that name no story,
  so both grains and the leftover card are exercised;
- a project that is deliberately **not** a git repository, so the trend view's unavailable
  branch is covered.

One test writes to this workspace — the live-update case has to, because the thing under
test is the watcher. It ticks a checkbox in a copy staged for the purpose and restores the
file afterwards, and the fixture directory belongs to the tests rather than to a user, so
Constitution I is untouched: SpecDash still never writes into a scanned project; the test
harness does, to its own.

## Reaching the last 28% of the backend

- **`history.py` (17%)**: needs commits, so the session fixture runs `git init`, writes
  `tasks.md` at three revisions and commits each. Mocking `subprocess` here would test the
  mock — the whole point of this module is that it parses what git actually prints.
- **`git.py` (41%)**: the allow-list rejection, the timeout path, the non-zero exit and the
  not-a-repository branch. Each is a real behaviour with a real consequence.
- **`main.py` (49%)**: the websocket round trip via `TestClient.websocket_connect`, the
  broadcast-to-a-dead-client path, `_watch_loop` driven with a fake `awatch` that yields a
  change, a timeout and then raises, and the SPA fallback with a temporary static directory.
- **`scanner.py` (73%)** and **`parsing.py` (92%)**: the remaining error branches and the
  document shapes not yet in a fixture.

Where a line cannot be reached without contrivance — the `if TYPE_CHECKING` style guards
and the uvicorn entry point — it is excluded with a comment saying why, per FR-006.

## Alternatives considered

**A component-level frontend suite (vitest + testing-library) instead of E2E.** Rejected as
the first move: it would test the components against a mocked snapshot, which is the same
blindness as a mocked API, and the three bugs this project has actually shipped were all at
seams. E2E first, and a component suite later if the E2E turns out to be too coarse to
locate failures.

**A container per test.** Rejected on time: the image build dominates, and the read-only
guarantee it would additionally prove is already asserted by the existing CI job.

## Complexity Tracking

No constitutional deviation. Nothing here ships in the image, nothing writes into a user's
project, and the coverage number is a floor rather than a claim of correctness — which the
spec says out loud rather than letting the badge imply it.

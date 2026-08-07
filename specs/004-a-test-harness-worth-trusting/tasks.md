---

description: "Task list for the Playwright suite and full backend coverage"
---

# Tasks: A test harness worth trusting

**Input**: Design documents from `/specs/004-a-test-harness-worth-trusting/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Ticked against the code on 2026-08-07**, after the documents above were written. Backend
coverage went 72% → 100% with nothing excluded, so FR-006 had nothing to justify. The
Playwright suite is 33 cases and runs in about 18 seconds.

**Tests**: This feature *is* the tests. The gate on itself is that both suites run in CI
and fail the build.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: Which user story the task serves (US1–US3)

---

## Phase 1: Setup

- [x] T001 Add `pytest-cov` to `backend/requirements-dev.txt` and a Python 3.13 virtualenv to `.gitignore`
- [x] T002 [P] Add `@playwright/test` to the frontend dev dependencies and an `e2e` script
- [x] T003 [P] Exclude `e2e/` from the image build context

---

## Phase 2: User Story 1 — Prove the board works without opening it (Priority: P1)

**Goal**: The real application, driven in a real browser, against files on disk.

**Independent test**: The suite passes headless against the fixture workspace.

- [x] T004 [US1] Build the checked-in fixture workspace under `e2e/fixtures/workspace/` — a project with a feature in each interesting stage, a project with uneven stories plus tasks naming no story, and a project deliberately not under git
- [x] T005 [US1] Write `playwright.config.ts` starting uvicorn on its own port with `SPECDASH_ROOTS` at the fixture and `SPECDASH_STATIC` at the built frontend
- [x] T006 [US1] Spec: every feature lands in the column its files justify, with the counts the fixture implies
- [x] T007 [US1] Spec: the grain switch, and that the choice survives a reload
- [x] T008 [US1] Spec: search narrows the board, and the header total and badge follow the grain
- [x] T009 [US1] Spec: a story card opens the drawer on its feature with that story expanded, and the leftover card opens the task list
- [x] T010 [US1] Spec: the drawer's tabs — overview, tasks, checklists, documents, history — each render from the files
- [x] T011 [US1] Spec: the trend view draws a series for a git project and says history is unavailable for the one that is not
- [x] T012 [US1] Spec: ticking a checkbox on disk moves the card without a reload, waiting on the board rather than on a timer, and restoring the file afterwards

---

## Phase 3: User Story 2 — Every line of the backend has been run (Priority: P1)

**Goal**: 100% line coverage, enforced by the runner.

**Independent test**: `pytest --cov=app --cov-fail-under=100` passes.

- [x] T013 [US2] Build a real git repository in a session fixture — `git init`, three revisions of `tasks.md`, one commit each — rather than mocking `subprocess`
- [x] T014 [US2] Cover `history.py`: the series itself, the blob cache, the HEAD cache, the stale list, and every unavailable branch
- [x] T015 [US2] Cover `git.py`: the read-only allow-list refusal, a non-zero exit, a timeout, and the not-a-repository case
- [x] T016 [US2] Cover `main.py`'s websocket: connect, snapshot on connect, `ping`, `refresh`, disconnect, and a broadcast to a client that has died
- [x] T017 [US2] Cover `_watch_loop` with a fake `awatch` yielding a change, a timeout, a layout change and an exception, asserting it restarts rather than dying
- [x] T018 [US2] Cover the SPA fallback and the static mount against a temporary static directory
- [x] T019 [US2] Cover the remaining branches of `scanner.py` and `parsing.py`
- [x] T020 [US2] Turn the gate on in `backend/pytest.ini` with `--cov-fail-under=100`, and justify every exclusion at its site

---

## Phase 4: User Story 3 — The gates hold on someone else's machine (Priority: P2)

- [x] T021 [US3] Add a Playwright job to CI that builds the frontend, installs only Chromium, and uploads the trace on failure
- [x] T022 [US3] Enforce the coverage gate in the existing backend job
- [x] T023 [US3] Document both suites in the README

---

## Phase 5: Polish

- [x] T024 Verify a deliberate regression is caught — move a card to the wrong column, break the grain switch — and record what failed

**What the regression check found.** Reporting a fully ticked feature as `implement`
instead of `done` failed `test_stage_is_derived_from_artefacts_not_from_the_status_line`
and two E2E cases (the Done column's contents and the column subtitle). Downgrading the
remembered grain from `localStorage` back to `useState` failed the reload case and nothing
else — which is the point of driving a real browser, since no unit test can tell the
difference. Both changes were reverted and both suites are green.

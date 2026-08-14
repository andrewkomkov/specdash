---
description: "Task list for reading the rest of spec-kit"
---

# Tasks: The board reads the rest of spec-kit

**Input**: Design documents from `/specs/008-the-rest-of-spec-kit/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Tests**: the backend gate is `--cov-fail-under=100`, so a task that adds a branch is not done
until a test reaches it. Test tasks are therefore listed beside the code they cover rather than
collected into a phase at the end, where they would be easy to defer.

**Ticked against the code on 2026-08-14.** Running the finished scanner over the author's whole
root — 8 projects, 35 features, which the constitution's Development Workflow clause requires and
which no unit test substitutes for — changed two rules that had passed every test written for
them:

- **`[NEEDS CLARIFICATION]` matched inside code formatting.** Two features reported themselves as
  unclear because their prose *described* the marker. This was not a new defect: `open_questions`
  already placed features, so the board was mis-staging its own repository before this feature
  existed. Fixed in `strip_code`, and recorded as FR-003a rather than slipped in.
- **`requirement-unreferenced` produced 104 findings against 13 real gaps**, one per requirement.
  A card carries a count, so a single blocker sat behind thirty warnings. Collapsed to one finding
  per feature; the run now reports 18 findings across 17 of 35 cards.

## Phase 1: Setup

- [x] T001 Add `PyYAML` to `backend/requirements.txt`, pinned like its neighbours
- [x] T002 Add the new models to `backend/app/models.py`: `Finding`, `ConstitutionResult`,
      `ComplexityRow`, `ManifestFile`, `Toolchain`, `WorkflowStep`, `DeclaredWorkflow`, `Entity`,
      and the `Severity` literal (FR-002)
- [x] T003 Extend `Feature` with `findings`, `constitution`, `entities`, `assumptions`,
      `dependencies`; extend `Project` with `toolchain` and `workflows` (FR-025)
- [x] T004 Mirror every new model into `frontend/src/types.ts`

## Phase 2: User Story 1 — See what the artefacts disagree about (Priority: P1)

- [x] T005 [US1] New `backend/app/checks.py` with `findings_for(feature) -> list[Finding]`,
      importing only `models` so it cannot touch the filesystem (FR-001)
- [x] T006 [US1] Rule `requirement-unreferenced` (FR-003), guarded on the feature tracing any id
      at all, and collapsed to one finding — both changes forced by the real-root run
- [x] T007 [US1] Rule `open-clarification` (FR-004): severity by stage, blocker from `plan` onward
- [x] T008 [US1] Ignore markers inside fenced blocks and inline code (FR-003a), in `strip_code`
- [x] T008a [US1] Fold a task's wrapped continuation lines into its description (FR-003b) — found
      because this feature's own traceability finding would not clear: the ids were cited on the
      second physical line of each task, and nothing had ever read one
- [x] T009 [US1] Rule `status-disagrees` (FR-005): report only, never re-stage — 8 real instances
- [x] T010 [US1] Rule `story-not-in-spec` (FR-006): `UserStory.in_spec` marks it, the card stays
- [x] T011 [US1] Rule `requirement-duplicate` (FR-007), fed by per-section duplicate tracking
- [x] T012 [US1] Rule `checklist-open-in-done` (FR-008)
- [x] T013 [US1] Rule `constitution-failed` (FR-009), reading the result produced in Phase 3
- [x] T014 [US1] Deterministic ordering by severity, code then reference (FR-002)
- [x] T015 [US1] Call `findings_for` at the end of `scan_feature`, after stage resolution
- [x] T016 [US1] `backend/tests/test_checks.py`: one test per rule, a clean feature producing none,
      the ordering guarantee, and the two regressions the real-root run found
- [x] T017 [US1] Card badge in `frontend/src/components/FeatureCard.tsx` (FR-023) — it replaces the
      old open-questions badge, which was one finding shown twice
- [x] T018 [US1] `Checks` tab in `frontend/src/components/FeatureDrawer.tsx` (FR-024), each finding
      naming the file it rests on

## Phase 3: User Story 2 — Know whether a feature passes its own constitution (Priority: P1)

- [x] T019 [US2] `parse_constitution_check` in `backend/app/parsing.py` (FR-010): verdict, evidence
- [x] T020 [US2] Placeholder template text resolves to `unknown` (FR-011), via `is_placeholder`
- [x] T021 [US2] `Complexity Tracking` into `ComplexityRow`s, placeholder row dropped (FR-012)
- [x] T022 [US2] Widen `parse_plan` to return the constitution result; absent stays `None` (FR-013)
- [x] T023 [US2] Tests covering pass, fail, unknown, placeholder, absent, and a table with rows
- [x] T024 [US2] Render the verdict, its evidence and the complexity table in the `Checks` tab

## Phase 4: User Story 3 — Know what spec-kit each project is running (Priority: P2)

- [x] T025 [US3] Read `.specify/integration.json` and `.specify/init-options.json` (FR-014)
- [x] T026 [US3] `verify_file`: containment check first (FR-016), then size bound (FR-017), then
      chunked SHA-256
- [x] T027 [US3] Classify each listed file `ok` / `modified` / `missing` / `unverified` (FR-015)
- [x] T028 [US3] Tests: a matching file, a modified file, a missing file, an oversized file, a
      manifest path escaping the root, and a symlink pointing out of it
- [x] T029 [US3] Surface version, integration and drift on the project chip tooltip and the API.
      The run found four different spec-kit versions across eight projects, and drift on this one

## Phase 5: User Story 4 — See the process a project has declared (Priority: P2)

- [x] T030 [US4] Read `workflow-registry.json` into `DeclaredWorkflow`s (FR-018)
- [x] T031 [US4] Parse each `workflow.yml` with `yaml.safe_load`; file wins over registry (FR-021)
- [x] T032 [US4] Classify steps as gate or command, carrying message and `on_reject` (FR-019)
- [x] T033 [US4] Skip an unreadable, invalid or steps-less workflow with a reason (FR-020)
- [x] T034 [US4] Tests: a good workflow, a broken one, one with no steps, and a registry entry
      with no file on disk
- [x] T035 [US4] Show workflows and their gates on the project surface (FR-025)

## Phase 6: User Story 5 — Read the dropped spec sections (Priority: P3)

- [x] T036 [US5] Parse `Key Entities` into name/description pairs (FR-022)
- [x] T037 [US5] Parse `Assumptions` and `Dependencies` into lists (FR-022)
- [x] T038 [US5] Tests for all three, including specs that have none of them
- [x] T039 [US5] Render them in the drawer's overview

## Phase 7: Polish

- [x] T040 Both languages for every new string in `frontend/src/i18n.ts` (FR-027)
- [x] T041 Playwright coverage for the card badge, the `Checks` tab, and the absence of both on a
      clean feature (FR-023, FR-026) — `e2e/tests/checks.spec.ts`, 60 tests green
- [x] T042 `ruff check`, `pytest` at 100%, `tsc -b && vite build` all green
- [x] T043 Run against the author's whole mounted root per the Development Workflow clause. Two
      rules changed as a result; both changes are recorded above and in the spec
- [x] T044 Confirm SC-005: scan of the real root is 314 ms against 331 ms before, inside the 25% cap
- [x] T045 Confirm SC-007: a project with none of the new files scans exactly as before —
      `test_a_project_with_none_of_the_files_has_no_toolchain`, and the `beacon` and `orphan` e2e
      fixtures, which hold no `.specify/` at all
- [x] T046 Confirm FR-028: the board still has six columns and no finding moves a card

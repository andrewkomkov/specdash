---
description: "Task list for the frontend major dependency bumps"
---

# Tasks: The frontend majors that can actually land

**Input**: Design documents from `/specs/007-frontend-majors-that-can-land/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Tests**: The read-only guarantee is tested end to end against the real backend and the real
built bundle, because the thing that changed — whether a click mutates a control — is not
visible to a unit test with a mocked component.

## Phase 1: User Story 1 — The board still refuses to be edited (Priority: P1)

- [ ] T001 [US1] Bump `@mantine/core` and `@mantine/hooks` to 9 in `frontend/package.json`
- [ ] T002 [US1] Add `aria-readonly` to both checkbox render sites in `frontend/src/components/FeatureDrawer.tsx` — the Tasks tab and the Documents checklists
- [ ] T003 [US1] Replace the `readOnly` DOM-property assertion in `e2e/tests/drawer.spec.ts` with the semantic marker, which is real for a checkbox where `readonly` is not
- [ ] T004 [US1] Assert the guarantee itself — clicking a checkbox leaves it unchanged — which no version of this test has checked
- [ ] T005 [US1] Cover the Documents-tab checklists too, a second render site that was never under test

## Phase 2: User Story 2 — The toolchain moves forward (Priority: P2)

- [ ] T006 [US2] Bump `vite` to 8 and `@vitejs/plugin-react` to 6 **in one change** — either alone deadlocks on the other's peer range
- [ ] T007 [US2] Confirm `manualChunks` survives rolldown by comparing emitted chunk names before and after
- [ ] T008 [US2] Hold `typescript` at 5.8 and record why beside the pin, with the upstream issue

## Phase 3: User Story 3 — Coupled packages arrive coupled (Priority: P3)

- [ ] T009 [US3] Group `vite` with `@vitejs/plugin-react` in `.github/dependabot.yml`

## Phase 4: Verification

- [ ] T010 `npm ci` resolves on default flags, no `--legacy-peer-deps`
- [ ] T011 `tsc -b --force` and `eslint .` both clean
- [ ] T012 Full e2e suite green, and the new read-only test fails when a checkbox is made writable
- [ ] T013 Close #27, #25 and #21 as superseded; comment the upstream blocker on #26

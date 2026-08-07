---
description: "Task list for the frontend major dependency bumps"
---

# Tasks: The frontend majors that can actually land

**Input**: Design documents from `/specs/007-frontend-majors-that-can-land/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Ticked against the code on 2026-08-07**, after the documents above were written. The
chunking check turned up one thing the plan did not predict: rolldown honours `manualChunks`
but does not emit the `vendor` catch-all as its own chunk, folding those 44 KB into `mantine`
instead. Every deliberate split survives and total bytes are within 1%, so this is recorded
rather than fixed -- it costs a little cache independence for those leftovers and nothing else.

**Tests**: The read-only guarantee is tested end to end against the real backend and the real
built bundle, because the thing that changed — whether a click mutates a control — is not
visible to a unit test with a mocked component.

## Phase 1: User Story 1 — The board still refuses to be edited (Priority: P1)

- [x] T001 [US1] Bump `@mantine/core` and `@mantine/hooks` to 9 in `frontend/package.json`
- [x] T002 [US1] Add `aria-readonly` to both checkbox render sites in `frontend/src/components/FeatureDrawer.tsx` — the Tasks tab and the Checklists tab
- [x] T003 [US1] Replace the `readOnly` DOM-property assertion in `e2e/tests/drawer.spec.ts` with the semantic marker, which is real for a checkbox where `readonly` is not
- [x] T004 [US1] Assert the guarantee itself — clicking a checkbox leaves it unchanged — which no version of this test has checked
- [x] T005 [US1] Cover the Checklists tab too, a second render site that was never under test

## Phase 2: User Story 2 — The toolchain moves forward (Priority: P2)

- [x] T006 [US2] Bump `vite` to 8 and `@vitejs/plugin-react` to 6 **in one change** — either alone deadlocks on the other's peer range
- [x] T007 [US2] Confirm `manualChunks` survives rolldown by comparing emitted chunk names before and after
- [x] T008 [US2] Hold `typescript` back from 7.0 with a narrow range ignore, not a major-wide one, and record why beside it with the upstream issue — the range left 6.0.3 reachable, which dependabot then proposed and which merged green (#35), so the frontend is on TypeScript 6 rather than stuck on 5.8

## Phase 3: User Story 3 — Coupled packages arrive coupled (Priority: P3)

- [x] T009 [US3] Group `vite` with `@vitejs/plugin-react` in `.github/dependabot.yml`

## Phase 4: Verification

- [x] T010 `npm ci` resolves on default flags, no `--legacy-peer-deps`
- [x] T011 `tsc -b --force` and `eslint .` both clean
- [x] T012 e2e suite green — 54 pass; `live.spec.ts` "ticking a box on disk" fails locally on macOS **and fails identically on `main`**, so it is pre-existing and not attributable here. It passes in CI, which is the authority for it
- [x] T012a Prove the new test guards something: mutating a checkbox to be writable fails it, including when it is left labelled read-only — the case the old assertion would have passed
- [x] T013 Close #27, #25 and #21 as superseded, and #26 with the upstream blocker recorded — the narrow ignore brings it back at 7.1 rather than leaving it to rot open

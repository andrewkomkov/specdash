---
description: "Task list for the visual redesign"
---

# Tasks: One system of colour

**Input**: Design documents from `/specs/009-one-system-of-colour/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Tests**: the existing Playwright suite is the regression net for FR-020 — it already asserts on
placement, counts, tabs, search and live updates, which is exactly the set a restyle can break
without anyone noticing. New tests are added only for the guarantees this feature introduces, and
the four existing assertions that name something deliberately changed are updated in place.

**Ticked against the code on 2026-08-14.** Opening the built board found three things no amount of
palette validation would have:

- **Cards overflowed their columns.** Carrying the severity as a *word* (FR-003) widened the card's
  `nowrap` footer row, and a grid item's `min-width` defaults to `auto`, so the whole card grew
  past its column. Fixed by moving the finding badge onto its own line — where it belongs anyway,
  since a finding is about the feature's state, not about which of its documents exist.
- **Every filled control went near-black in light mode.** `primaryShade: { light: 8 }` picks the
  step for *all* filled colours, not only the primary one. Reverted to 6.
- **The headline hid the feature count.** Moving the count inside the percentage block meant a
  search matching nothing showed neither — caught by an existing test asserting `0 features`, which
  is precisely what that suite is for.

## Phase 1: Foundational — the tokens everything else consumes

- [x] T001 New `frontend/src/theme.css`: colour roles and the 11/13/15/20/28 type scale as custom
      properties, dark declared under both `prefers-color-scheme` and `data-mantine-color-scheme`,
      which is the attribute Mantine actually writes (FR-001, FR-009, FR-019)
- [x] T002 The six stage steps per scheme, as selected sets rather than inversions (FR-007)
- [x] T003 Brand scale in `frontend/src/main.tsx` with `#2BB77B` at index 6, and a neutral scale
      built from `#373B46` at index 5, so surfaces belong to the same palette as what sits on them
- [x] T004 Import the token file once, in `main.tsx` beside the Mantine stylesheet
- [x] T005 Validator run on both ramps against their own surfaces; the numbers are in the spec
      rather than summarised (FR-008, SC-002)

## Phase 2: User Story 1 — Finished work stops looking like an emergency (Priority: P1)

- [x] T006 [US1] `progressColor` becomes `PROGRESS_COLOR`, one hue at one step (FR-006)
- [x] T007 [US1] Delete `projectColor` and its call sites (FR-005, SC-007)
- [x] T008 [US1] Story badges lose `PRIORITY_COLOR`; priority is `PRIORITY_WEIGHT` (FR-004)
- [x] T009 [US1] `SEVERITY_VAR` becomes the reserved status role (FR-002)
- [x] T010 [US1] Every finding surface carries an icon and a word beside its colour (FR-003)
- [x] T011 [US1] The `current` badge loses its orange-to-red gradient, and the checklist pill its
      yellow — both put alarm colour on cards with nothing wrong
- [x] T012 [US1] `SearchPalette`'s six per-kind hues go neutral: the kind is already spelled out,
      and two of the six were colours a finding is entitled to
- [x] T013 [US1] Playwright: the Done column contains neither status colour (SC-001)
- [x] T014 [US1] Playwright: a blocker survives its colour being ignored — icon and word

## Phase 3: User Story 2 — The board leads with the number it exists to report (Priority: P1)

- [x] T015 [US2] Header stat block: percentage at the display step, count and total beside it
      (FR-010)
- [x] T016 [US2] Project chips lose their hue and read checked/unchecked by fill (FR-005)
- [x] T017 [US2] The feature count sits outside the percentage block, so a search matching nothing
      still says `0 features` — a regression the existing suite caught
- [x] T018 [US2] Playwright: the percentage is the largest numeral on the board, in rendered px

## Phase 4: User Story 4 — A card says one thing once (Priority: P2)

- [x] T019 [US4] Remove the card's ring; keep the bar and put the percentage on its label (FR-013)
- [x] T020 [US4] Promote the title to the title step; the accent rule now carries the stage
      (FR-014)
- [x] T021 [US4] Finding badge onto its own line; the artefact row stays one row (FR-015)
- [x] T022 [US4] `min-width: 0` on column children — one nowrap row was enough to push a card out
      of its column
- [x] T023 [US4] Ring kept in the drawer, where there is room and one feature is in view
- [x] T024 [US4] Checked at 1920px against the author's real root: no card clips its column

## Phase 5: User Story 3 — The pipeline reads as a pipeline (Priority: P2)

- [x] T025 [US3] Each column takes its stage step as a top rule and a header dot (FR-011)
- [x] T026 [US3] Empty columns state what would put a card there (FR-012)
- [x] T027 [US3] Both languages for the six empty-column sentences
- [x] T028 [US3] Playwright: the six columns carry six distinct steps

## Phase 6: User Story 5 — The trend view belongs to the same application (Priority: P3)

- [x] T029 [US5] Trend charts move to the progress token and the ink tokens (FR-017)
- [x] T030 [US5] Confirmed the grid, axis labels and two-series legend already present are intact
- [x] T031 [US5] Confirmed no chart carries two value axes (FR-018)
- [x] T032 [US5] Staleness marker uses the status token rather than a bare `orange`

## Phase 7: Polish and verification

- [x] T033 Drawer overview reference blocks into two columns above 900px (FR-016)
- [x] T034 Every `10px` literal replaced by the scale, whose floor is 11px so the evidence strings
      do not shrink (FR-009)
- [x] T035 Reduced-motion fallback for the change flash preserved (FR-022)
- [x] T036 Nothing added looks editable; the read-only assertion in the drawer suite still passes
      (FR-021)
- [x] T037 `npm run lint` clean (0 errors) and `tsc -b && vite build` green
- [x] T038 Playwright 64 tests green; four assertions updated with the reason recorded in the test
- [x] T039 SC-006: CSS grew 36.18 → 36.59 kB gzipped, +0.41 kB against a 4 kB cap
- [x] T040 SC-003 checked in the browser, not asserted from the source
- [x] T041 Opened in both schemes at 1920px and looked at — which is how the two layout defects and
      the light-mode one above were found
- [x] T042 FR-023: no logo file added to the repository or the image

## Outstanding

- [ ] T043 Regenerate `.github/assets/*.png`, which still show the old design. Held deliberately:
      the current shots are taken against the author's real root and would put three project names
      into a public repository that were not there before. Needs a decision, not a command.

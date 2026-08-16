---
description: "Task list for keeping every card inside its column"
---

# Tasks: A card stays in its column

**Input**: Design documents from `/specs/011-a-card-stays-in-its-column/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Ticked against the code on 2026-08-16.** T002 is the task that mattered: with the fixture as it
stood, the new spec passed against the broken build in English, because the fixture's cards fit by
four pixels. The contracts file is what makes the test a test.

## Phase 1: User Story 1 — Every card is inside the column that placed it (Priority: P1)

- [x] T001 [US1] A Playwright spec that measures each card's box against its column's box, in both
      grains and in Russian, and flags any element inside a column that scrolls sideways
      (FR-001, FR-002)
- [x] T002 [US1] A fixture feature wide enough to break it: `contracts/` on `atlas/001`, so the
      footer carries a contracts count as well as a checklist figure — confirmed failing against
      the pre-fix build in English and in Russian
- [x] T003 [US1] `min-width: 0` on the ScrollArea's content slot, through `classNames`, so the
      column is a ceiling the cards cannot exceed (FR-001)
- [x] T004 [US1] The documents footer wraps rather than clipping, keeping the icons' own row
      `nowrap` (FR-003)
- [x] T005 [US1] `margin-inline-start: auto` on the age, so it holds the card's right edge on one
      line and on two (FR-004)

## Phase 2: User Story 2 — A long project id is cut, not honoured (Priority: P2)

- [x] T006 [US2] A `.projectPill` class that lets the badge shrink below its text, and its use on
      the feature card's project badge (FR-005)
- [x] T007 [US2] The same on the story card, replacing the `.pill` class that was forbidding it to
      shrink and letting it overprint `current` (FR-005)

## Phase 3: Verification

- [x] T008 The whole e2e suite. 67 passed; `live.spec.ts` "ticking a box on disk moves the card
      without a reload" fails on this machine on a clean checkout too, so it is not this feature's
- [x] T009 `eslint` clean on every file touched
- [x] T010 The author's real root at 1440px: features and stories, Russian and English, every card
      inside its column and `google_health_strava` ellipsised beside an intact `current` (FR-006)

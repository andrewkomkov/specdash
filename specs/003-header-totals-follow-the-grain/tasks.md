---

description: "Task list for making the header total follow the grain"
---

# Tasks: The header total counts what is on screen

**Input**: Design documents from `/specs/003-header-totals-follow-the-grain/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Ticked against the code on 2026-08-07**, after the documents above were written and before the branch was pushed.

**Tests**: One backend test, pinning the identity this feature leans on. The header
arithmetic is a reduce over an already-covered list, and this repository has no frontend
test harness; introducing one is not justified by a two-line change.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: Which user story the task serves

---

## Phase 1: User Story 1 — One header, one subject (Priority: P2)

**Goal**: The header total and the badge beside it describe the same set of cards.

**Independent test**: Search at story grain; the header total equals the sum of the visible
story cards, and switching grain moves the badge and the total together.

- [x] T001 [US1] Branch `totals` in `frontend/src/App.tsx` on the current grain, reducing over `storyRows` at story grain and over `features` otherwise
- [x] T002 [US1] Keep the feature-grain sum for the trend view, which is drawn per project rather than per story
- [x] T003 [US1] Name what the total counts, so "tasks of the cards shown" cannot be read as "tasks of the projects"

---

## Phase 2: Polish & Cross-Cutting

- [x] T004 [P] Test that a feature's stories plus its leftover bucket sum to its task total across every feature of the fixture workspace — the identity that makes the two grains agree on an unfiltered board
- [x] T005 Note in the README that the header follows the grain

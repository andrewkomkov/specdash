---

description: "Task list for reading the board at story grain"
---

# Tasks: Read the board at story grain

**Input**: Design documents from `/specs/002-board-at-story-grain/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Tests**: Backend tests are required and are written — the placement rule is the thing
most expensive to get wrong here, because a wrong column with a plausible reason under it
is the hardest kind of wrong to notice. Frontend behaviour is verified by hand against five
real projects; this repository has no frontend test harness, and inventing one for this
feature was out of scope.

**Ticked against the code on 2026-08-07.** This list was written after the feature shipped
— see the retrospective note in [spec.md](./spec.md#retrospective-note). Every claim below
was checked against the file it names before it was ticked.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: Which user story the task serves (US1–US4)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The domain change both halves read. Nothing below can be built without it.

- [x] T001 Give `UserStory` a `stage` and a `stage_reason` in `backend/app/models.py`, so a story can be laid out the way a feature is
- [x] T002 Mirror the two fields in `frontend/src/types.ts`

---

## Phase 2: User Story 1 — See the work, not just the features (Priority: P1)

**Goal**: One card per user story, in the column its own ticked tasks justify.

**Independent test**: Every user story of every feature appears exactly once, with counts
matching a manual read of the `[US#]` tags in `tasks.md`.

- [x] T003 [US1] Write `_story_stage` in `backend/app/scanner.py` beside `_decide_stage`, sharing its vocabulary of evidence strings rather than restating the rule
- [x] T004 [US1] Place a story with tasks by its own ticks — all ticked is Done, some ticked is Implement, none ticked is Tasks
- [x] T005 [US1] Place a story with no tasks where its feature sits, and say which reason applies: the work is not cut into tasks yet, or it is and no task names this story
- [x] T006 [US1] Apply the rule to every parsed story in `scan_feature`, after the feature's own stage is decided
- [x] T007 [P] [US1] Build the story card in `frontend/src/components/StoryCard.tsx` — story id and priority, title, owning feature, task progress, acceptance count, evidence when there are no tasks
- [x] T008 [P] [US1] Reuse `FeatureCard.module.css` rather than forking it, so hover, accent and flash cannot drift between the two card types
- [x] T009 [US1] Extract the column shell in `frontend/src/components/Board.tsx` and add `StoryBoard` alongside `Board`, differing only in what they filter and render
- [x] T010 [US1] Sum the column counters over the cards actually shown, so the subtitle means the same thing at either grain
- [x] T011 [US1] Open the owning feature from a story card with that story expanded, via a `focusStory` prop on `FeatureDrawer`

---

## Phase 3: User Story 2 — Keep the feature grain a click away (Priority: P1)

**Goal**: Two grains, one click apart, and the board opens in whichever was last used.

**Independent test**: Switch grain, reload, and the board comes back in the grain chosen.

- [x] T012 [US2] Make the header control three-way — `Фичи · Истории · Динамика` — rather than adding a second control beside it
- [x] T013 [US2] Persist the choice in `localStorage`, not on disk: SpecDash writes nothing into a scanned project
- [x] T014 [US2] Derive both grains from the snapshot already held in the browser — no new endpoint, no new request, no rescan
- [x] T015 [US2] Match story titles in the existing search, and count the shown cards in the header badge
- [x] T016 [US2] Say "истории" in the search placeholder once stories are searchable, rather than leaving it claiming only features and tasks

---

## Phase 4: User Story 3 — Do not lose the work that names no story (Priority: P2)

**Goal**: The per-column totals at story grain account for every task the feature grain counts.

**Independent test**: For any feature, stories plus leftover bucket sum to its task total.

- [x] T017 [US3] Carry the tasks that name no story as `Feature.unassigned`, a story-shaped record populated only when such tasks exist
- [x] T018 [US3] Keep it out of `user_stories`, so every existing reader of that list is untouched
- [x] T019 [US3] Place it by the same rule as any story, and render it as a card at story grain
- [x] T020 [US3] Open the task list from that card rather than an overview panel with no row to expand

---

## Phase 5: User Story 4 — Say what a number counts (Priority: P3)

**Goal**: No counter on screen without its unit.

**Independent test**: Open any feature with stories; the counter names what it counted.

- [x] T021 [US4] Label the per-story counter in `frontend/src/components/FeatureDrawer.tsx` as `задач`, and name the `[US#]` tag it counted on hover

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: The things that keep the above true after the next change.

- [x] T022 [P] Test that a story is placed by its own ticks rather than inheriting its feature's
- [x] T023 [P] Test that a story with no tasks of its own sits where its feature sits, with the feature's reason
- [x] T024 [P] Test that a story no task names says so, rather than claiming the feature's progress
- [x] T025 [P] Test the totals identity: stories plus leftover bucket equal the feature's task total
- [x] T026 [P] Test that a feature whose every task names a story carries no leftover bucket
- [x] T027 Describe both grains in the README, including why the leftover card exists
- [x] T028 Write this feature up in `specs/` and point `.specify/feature.json` at it — the board was showing this project as 100% Done while the container held a capability no spec mentioned

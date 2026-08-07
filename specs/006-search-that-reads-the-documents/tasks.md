---

description: "Task list for full-text search over the documents"
---

# Tasks: Search that reads the documents

**Input**: Design documents from `/specs/006-search-that-reads-the-documents/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Ticked against the code on 2026-08-07**, after the documents above were written. Measured
on the author's corpus: the index is 1420 rows over 869 KB, builds in **41 ms** beside a
116 ms scan, and answers in **0.3–3 ms**. Two of the plan's own decisions were overturned by
measurement mid-build and are recorded where they were made.

**Tests**: The escaper and the ranking are unit-tested against the real engine rather than a
mock — the whole point is what SQLite actually does with a query. The palette is tested end
to end, because a keyboard-driven overlay is not a thing a unit test can see.

## Phase 1: User Story 1 — Find the sentence, not just the card (Priority: P1)

- [x] T001 [US1] Write `backend/app/search.py` — an in-memory FTS5 index built from a snapshot, with a `porter` table for ranking and a `trigram` table for substrings
- [x] T002 [US1] Index full document bodies — and **not** by threading the scanner's already-read text through to the indexer, which the plan proposed: measured, reading all 106 files costs 4.6 ms of a 119 ms build, so the sink would have saved 4 ms in exchange for a new seam through three functions
- [x] T003 [US1] Escape every user term into a quoted prefix match, so `read-only` is text and not syntax — this raises against the real engine if it is got wrong
- [x] T004 [US1] Rank with BM25 and return a snippet showing the match in context
- [x] T005 [US1] Serve `GET /api/search`, documented in `contracts/http-api.md`

---

## Phase 2: User Story 2 — Search everything the board knows (Priority: P1)

- [x] T006 [US2] Index tasks, user stories, requirements, success criteria, checklist items and features, each with its kind
- [x] T007 [US2] Give every hit its project, its feature and a subtitle, so a title never has to carry the context alone
- [x] T008 [US2] Let results be filtered to one kind

---

## Phase 3: User Story 3 — Be forgiving (Priority: P2)

- [x] T009 [US3] Fall back to the trigram index when the token index finds nothing
- [x] T010 [US3] Offer the closest real titles with `difflib` when both come back empty
- [x] T011 [US3] Verify it behaves the same in Russian

---

## Phase 4: User Story 4 — Stay live and stay one container (Priority: P1)

- [x] T012 [US4] Build the index inside the existing rescan thread and swap it in with one assignment, so a search mid-rescan is answered by a complete index
- [x] T013 [US4] Keep it in memory — an index file would be the first thing SpecDash ever wrote
- [x] T014 [US4] Add no dependency, and assert in CI that the image gains none

---

## Phase 5: The palette

- [x] T015 Build the command palette from Mantine's Modal — ⌘K and Ctrl+K, arrow keys, Enter to open, Escape to close
- [x] T016 Leave the header filter exactly as it is; it answers a different question
- [x] T017 Open the right thing from a hit — the document in the drawer, the task list, or the story
- [x] T018 Translate the palette into both languages

---

## Phase 6: Polish & Cross-Cutting

- [x] T019 [P] Unit tests: escaping, ranking order, snippets, the trigram fallback, the suggestion, and every empty-input edge
- [x] T020 [P] Keep backend coverage at 100%
- [x] T021 [P] E2E: open the palette from the keyboard, search a phrase that exists only in a document body, and land on it
- [x] T022 Document the endpoint and the palette in the README

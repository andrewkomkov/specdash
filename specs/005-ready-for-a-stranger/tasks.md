---

description: "Task list for making the repository and the board usable by someone else"
---

# Tasks: Ready for a stranger

**Input**: Design documents from `/specs/005-ready-for-a-stranger/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Ticked against the code on 2026-08-07**, after the documents above were written. 232
Cyrillic literals became 0 outside the dictionary, and CI now asserts that. The end-to-end
suite grew from 33 cases to 45.

**Tests**: Localisation and the keyboard path are behaviours no unit test can see, so both
are asserted end to end. The backend is untouched, so its coverage gate stands unchanged.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: Which user story the task serves (US1–US6)

---

## Phase 1: User Story 1 — Read the board in your own language (Priority: P1)

- [x] T001 [US1] Write `frontend/src/i18n.ts` — a flat dictionary, English as the fallback so a missing key renders readable text rather than the key
- [x] T002 [US1] Give each language its own plural rule; `1 историй` is on screen today and is what naive interpolation produces
- [x] T003 [US1] Default to the browser's language, fall back to English, and remember an explicit choice
- [x] T004 [US1] Add a language control to the header
- [x] T005 [US1] Translate the shell, the board and the columns
- [x] T006 [US1] Translate the cards, both kinds
- [x] T007 [US1] Translate the drawer and every panel in it
- [x] T008 [US1] Translate the trend view
- [x] T009 [US1] Move `relativeTime` into the dictionary — it is interface copy that happens to live in a utility
- [x] T010 [US1] Leave everything read from a user's files alone: titles, summaries, task text, and the scanner's evidence strings are their content and its output, not our copy

---

## Phase 2: User Story 2 — Work the board without a mouse (Priority: P1)

- [x] T011 [US2] Give `FeatureCard` the role, tab stop, key handler and label that `StoryCard` already had
- [x] T012 [US2] Put a `:focus-visible` outline in the shared card stylesheet so neither card type can drift from the other

---

## Phase 3: User Story 5 — Be told what it does not protect (Priority: P2)

- [x] T013 [US5] Say in the README that the service is unauthenticated and reachable by anyone who can reach the port
- [x] T014 [US5] Show how to bind to localhost in `docker-compose.yml`

---

## Phase 4: User Story 3 — See what it is before installing it (Priority: P2)

- [x] T015 [US3] Capture the real board in English: both grains, the drawer and the trend view
- [x] T016 [US3] Rebuild the README around them, screenshot first
- [x] T017 [P] [US3] Add build, release and licence badges that report the truth

---

## Phase 5: User Story 4 — Know how to take part (Priority: P2)

- [x] T018 [P] [US4] `CONTRIBUTING.md`, including the spec-kit workflow this project holds itself to
- [x] T019 [P] [US4] `SECURITY.md` — what is in scope, and where to send a report
- [x] T020 [P] [US4] `CODE_OF_CONDUCT.md`
- [x] T021 [P] [US4] Issue and pull request templates
- [x] T022 [P] [US4] `dependabot.yml` for pip, npm and actions
- [x] T023 [P] [US4] `.editorconfig` and `CODEOWNERS`
- [x] T024 [US4] Lint both halves in CI — ruff and eslint — so style stops being a review topic

---

## Phase 6: User Story 6 — Find it without a terminal (Priority: P3)

- [x] T025 [US6] Write `site/index.html`, self-contained: no font host, no analytics, no CDN
- [x] T026 [US6] Make it readable on a phone and in both colour schemes
- [x] T027 [US6] Publish it from CI on every push to main

---

## Phase 7: Polish & Cross-Cutting

- [x] T028 [P] E2E: the board in English, the board in Russian, the switch, and that the choice survives a reload
- [x] T029 [P] E2E: tab to a card and open it with the keyboard
- [x] T030 Move the existing E2E assertions to English, now that it is the default
- [x] T031 Assert no Cyrillic string literal remains outside the dictionary

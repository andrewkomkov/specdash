---
description: "Task list for one voice in two languages"
---

# Tasks: One voice in two languages

**Input**: Design documents from `/specs/012-one-voice-in-two-languages/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Ticked against the code on 2026-08-19.** T026 is the task that had to be rewritten rather than
ticked as first written: a sweep for Latin text on a Russian board fails on the fixture's own
`spec.md`, which says "so this feature belongs in Implement". The user's prose is exactly what
FR-003 protects, so the test asserts the absence of the labels this feature moved, not the absence
of Latin.

## Phase 1: The dictionary can decline (Priority: P1, US2)

- [x] T001 [US2] Two plural placeholder forms in `translate()` — `{n:noun}` for number and noun,
      `{n#noun}` for the noun alone — with plain substitution as the fall-through (FR-004)
- [x] T002 [US2] `PLURALS` extended to every noun the interface counts: file, workflow, checklist,
      requirement, document, match, finding and the three severities (FR-004)
- [x] T003 [US2] `form()` handles negative and fractional counts rather than falling through to
      the many-form by accident (FR-004)
- [x] T004 [US2] Every `(s)` key rewritten to a declining placeholder, in both languages (FR-004)
- [x] T005 [US2] `relativeTime()` rounds before it compares, so no bucket renders its own upper
      bound (FR-011)
- [x] T006 [US2] `RU` typed `Record<Key, string>`, so a key missing from Russian is a compile
      error (FR-010)

## Phase 2: The Russian reads as Russian (Priority: P1, US1)

- [x] T007 [US1] Six empty states rewritten to one construction, and the six hints to another
      (FR-005)
- [x] T008 [US1] The five inverted `Существительных: {count}` headings replaced (FR-005)
- [x] T009 [US1] `project.workflows` takes its list as a variable, ending the two-colon render
      (FR-005)
- [x] T010 [US1] Terminology settled per language and applied throughout: ticked/отмечена,
      passed/пройдена, checklist/чек-лист, spec.md rather than "спека" (FR-006, FR-007)
- [x] T011 [US1] Calques, first-person process labels and colloquialisms replaced; abbreviations
      punctuated (`дн.`, `мес.`, `г.`) (FR-005)
- [x] T012 [US1] English source copy corrected where it was the reason the translation was loose:
      sentence case for standalone tooltips, one word per concept, quoted query (FR-006)

## Phase 3: Nothing is English by accident (Priority: P1, US3)

- [x] T013 [US3] The connection indicator uses the three keys that were already written and never
      called (FR-001)
- [x] T014 [US3] `STAGE_LABEL` moved out of `types.ts` into `stage.*.label`, with a truncation
      guard on the header so a longer label cannot outgrow its column (FR-001)
- [x] T015 [US3] The `current` badge, the contracts suffix, the story tooltip and the constitution
      version fragment all take keys (FR-001)
- [x] T016 [US3] `Finding` carries `message_key` and `vars`; the seven rules fill them; the English
      `message` is still composed (FR-002)
- [x] T017 [US3] `ProjectHistory` carries `reason_key`; every unavailability reason fills it
      (FR-002)
- [x] T018 [US3] Artefact labels carry `label_key`; the six fixed labels, `Contract` and
      `Checklist` are translated while the file stem is not (FR-002, FR-007)
- [x] T019 [US3] The frontend renders backend prose from its key and falls back to the English
      sentence for a key it does not know (FR-002, and Principle III)

## Phase 4: Units follow the language (Priority: P2, US4)

- [x] T020 [US4] `formatBytes` takes the language and returns localised units and decimal
      separator (FR-008)
- [x] T021 [US4] The trend chart's axis dates and point tooltips use the chosen language (FR-008)
- [x] T022 [US4] The history tab renders a commit's age through `time.*` rather than git's own
      English `--date=relative` (FR-008)
- [x] T023 [US4] The header's scan duration is grouped like the search palette's (FR-008)
- [x] T024 [US4] `document.documentElement.lang` is set when the language is detected, not only
      when it is switched (FR-009)

## Phase 5: Verification

- [x] T025 Playwright: counted nouns at 1, 2, 5, 11, 21, 22 in both languages (SC-002)
- [x] T026 Playwright: on a Russian board, none of the English labels this feature moved into the
      dictionary comes back — scoped to what SpecDash writes, because the fixture's own spec.md
      says "belongs in Implement" and that sentence is the user's (SC-001, FR-003)
- [x] T027 pytest for the keys and variables the backend now emits (FR-002)
- [x] T028 `tsc -b`, `eslint`, `ruff` clean; the whole e2e suite and the whole pytest suite

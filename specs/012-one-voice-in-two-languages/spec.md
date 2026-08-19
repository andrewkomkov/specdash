# Feature Specification: One voice in two languages

**Feature Branch**: `012-one-voice-in-two-languages`

**Created**: 2026-08-19

**Status**: Implemented

**Input**: "The Russian on the board reads oddly." Four independent audits of the interface copy
followed — the Russian dictionary, the English source it is translated from, every string that
never reaches the dictionary at all, and every counted noun.

## Overview

The board is a reading instrument. Every card it draws is a claim about somebody's files, and the
words it makes that claim in are the whole interface — there is no other surface. So a sentence
that reads as a translation is not a cosmetic complaint: it is the instrument reporting in a voice
the reader has to decode before they can trust it.

Four things were wrong, and they are different kinds of wrong.

**The Russian was translated word by word.** `Nothing is at spec.md alone` became
`Ни у чего нет только spec.md` — a construction that is grammatical and unreadable. Six empty
columns are read one after another, and they had six different syntaxes for one idea. Elsewhere
the translator hit the agreement problem — `1 историй` — and escaped it by inverting the sentence
(`Открытых вопросов в спеке: {count}`), which trades a wrong ending for a phrase nobody says out
loud. Five strings carry that inversion; one of them, `project.workflows`, is concatenated with a
list at the call site and renders `Объявленных воркфлоу: 3: specify, plan`, with two colons.

**The English was the source of the Russian, and was itself loose.** Five keys used the `(s)`
plural hack (`1 project(s) were read incompletely`) in a file that ships a working plural
function. One checkbox state was called *closed*, *done*, *finished*, *open* and *unfinished* in
seven places, while the scanner's own evidence says *ticked* — and Principle II is what makes that
vocabulary load-bearing: a column explains itself in the same words a card cites. Tooltips were
split between sentence case and lowercase with no rule.

**Some strings never reached the dictionary.** The connection indicator prints `live` /
`connecting…` / `offline` as literals, although all three keys exist and have been translated
since the dictionary was written — the Russian was there and never reached the screen. The six
column headers, the largest text on the board, are a hardcoded English record in `types.ts`. The
`current` badge is hardcoded in three files. Dates in the trend chart are formatted with the
browser's locale rather than the chosen language, and file sizes with neither.

**The prose the backend writes was never translated at all.** Findings, the reasons a trend cannot
be drawn and the document labels are sentences SpecDash composes about a feature. In a Russian
interface an entire tab of them renders in English.

### What is deliberately left in English

The scanner's evidence strings — `all 38 tasks ticked`, `plan.md present, no tasks.md yet` — stay
as they are. That is the decision recorded in `i18n.ts` when the dictionary was written, and it is
the one this feature does not reopen: the evidence is a formula tied to the files it names, it is
quoted on the card, in the drawer and in the tests, and a translated formula stops matching the
document it describes. Findings are different in kind — they are sentences, not formulas — and
those are translated.

Filenames, ids, branches, git subjects, priorities and the `[P]` marker stay in the alphabet the
user's own files use.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Russian board reads as Russian (Priority: P1)

Someone switches the board to Russian and reads it end to end — six column headers, six empty
states, the cards, a drawer, the checks tab — without meeting a sentence that has to be decoded
back through English first.

**Why this priority**: it is the reported defect, and it is most of the interface.

**Independent Test**: read every Russian string in place against its English source; no calque, no
inverted `Существительных: {count}` heading, one syntax per group of strings that render together.

**Acceptance Scenarios**:

1. **Given** the interface in Russian, **When** a column is empty, **Then** it says what would put
   a card in it, in the same construction the five columns beside it use.
2. **Given** the interface in Russian, **When** a project declares workflows, **Then** its tooltip
   names them after one colon, not two.
3. **Given** the interface in Russian, **When** a string names a spec-kit artefact, **Then** it
   names it as the file is named on disk — `spec.md`, not "спека".

### User Story 2 - A number agrees with its noun, in both languages (Priority: P1)

The board counts constantly — features, tasks, commits, matches, findings — and every count is
read with its noun.

**Why this priority**: it is the most frequent defect on screen; a mis-agreed count appears
wherever a number does.

**Independent Test**: for each counted string, render it at 1, 2, 5, 11, 21 and 22 in both
languages; every form is the one a native reader expects.

**Acceptance Scenarios**:

1. **Given** the interface in Russian, **When** a column holds two tasks, **Then** it says
   `0/2 задачи в колонке`, not `0/2 задач`.
2. **Given** the interface in English, **When** exactly one project failed to scan, **Then** the
   alert says `1 project`, with no `(s)` anywhere in the interface.
3. **Given** a feature with one finding, **When** its badge is drawn, **Then** the badge agrees
   with the count in both languages.

### User Story 3 - Nothing on screen is English by accident (Priority: P1)

Every word SpecDash writes about a project is in the reader's language, whether it was composed in
the browser or on the server.

**Why this priority**: it is the largest single block of untranslated text, and the connection
indicator proves the failure mode — a translation can exist, be correct, and never be reached.

**Independent Test**: with the interface in Russian, sweep the board, a full drawer and the trend
view for Latin text; what remains is filenames, ids, git data and the evidence strings named
above.

**Acceptance Scenarios**:

1. **Given** the interface in Russian, **When** the websocket is connected, **Then** the indicator
   says `на связи`.
2. **Given** the interface in Russian, **When** the board is drawn, **Then** the six column
   headers are Russian.
3. **Given** the interface in Russian, **When** a feature has findings, **Then** every finding
   sentence is Russian.
4. **Given** the interface in Russian, **When** a project has no git history, **Then** the reason
   under "История недоступна" is Russian.

### User Story 4 - Dates, sizes and units follow the chosen language (Priority: P2)

**Why this priority**: narrower than the three above, but it produces the jarring case of a
Russian sentence with an English date inside it.

**Independent Test**: switch language without touching the browser's own locale; every rendered
date, size and duration changes with it.

**Acceptance Scenarios**:

1. **Given** an English interface in a Russian browser, **When** the trend chart is drawn,
   **Then** its axis dates are English.
2. **Given** the interface in Russian, **When** a document is listed, **Then** its size reads
   `12,3 КБ`.
3. **Given** a commit three days old, **When** the history tab is drawn, **Then** its age is
   rendered by the interface, not by the server's locale.

### Edge Cases

- 11, 12 and 14 take the many-form in Russian while 21 takes the one-form; 111 and 112 must not
  follow 1 and 2.
- A count of zero: `0 задач`, `0 features`.
- An age of 59.6 minutes must round to `1 ч назад`, never `60 мин назад`.
- A search query with spaces must be quoted inside the "nothing matches" sentence.
- A language the browser asks for that we do not have still falls back to English.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every user-facing string composed by SpecDash MUST come from the dictionary — no
  literal in a component, no English record in `types.ts`.
- **FR-002**: Prose composed by the backend — findings, unavailability reasons, document labels —
  MUST be rendered from a stable key and its variables, in the reader's language.
- **FR-003**: The scanner's evidence strings MUST remain exactly as the scanner writes them.
- **FR-004**: No counted noun may be interpolated without agreeing with its number, in either
  language. The `(s)` form MUST NOT appear anywhere.
- **FR-005**: Russian strings that render together MUST share one construction, and MUST NOT use
  the inverted `Существительных: {count}` form.
- **FR-006**: One concept MUST have one word per language: a checkbox is *ticked* / *отмечена*, a
  check is *passed* / *пройдена*, a list is a *checklist* / *чек-лист*.
- **FR-007**: spec-kit's own nouns — filenames, `[P]`, story and requirement ids — MUST NOT be
  translated or transliterated in either language.
- **FR-008**: Dates, times, durations and file sizes MUST be formatted in the language the reader
  chose, not the browser's.
- **FR-009**: `document.documentElement.lang` MUST match the language in use, including when it
  was detected rather than chosen.
- **FR-010**: A key missing from a language MUST be impossible to ship — the Russian dictionary is
  total over the key set, enforced by the type checker.
- **FR-011**: Relative time MUST round before it compares, so no bucket can render its own upper
  bound.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the interface in Russian, no English word appears on the board, in a drawer or
  in the trend view except filenames, ids, git data and the evidence strings of FR-003.
- **SC-002**: Every counted string renders correctly at 1, 2, 5, 11, 21 and 22 in both languages.
- **SC-003**: `(s)` appears nowhere in the interface or in the strings the backend composes.
- **SC-004**: The Russian dictionary covers every key, checked at compile time rather than at run
  time.
- **SC-005**: Switching language changes every date, size and duration on screen.

## Assumptions

- The six stage names are SpecDash's vocabulary rather than spec-kit's syntax, so they are
  translated. The tooltip beside each still explains the stage in the same words the scanner uses,
  which is what keeps them findable.
- Findings may be translated because a finding is a sentence SpecDash composes, while evidence is
  a formula it quotes. The backend keeps composing an English `message` as well, so the API stays
  readable and older clients keep working.
- Abbreviated Russian time units (`3 дн. назад`) are preferable to full declined forms, which
  would need an accusative case the two-form plural table does not carry.

## Dependencies

- None external. The dictionary gains no library: the plural rules and the placeholder syntax are
  a few lines of the same file, and the page still loads nothing from the internet.

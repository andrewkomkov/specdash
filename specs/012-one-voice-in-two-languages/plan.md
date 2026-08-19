---
description: "Implementation plan for one voice in two languages"
---

# Implementation Plan: One voice in two languages

**Branch**: `012-one-voice-in-two-languages`

**Input**: [spec.md](./spec.md)

## Summary

Teach the dictionary to decline, then move every string that never reached it — literals in
components, the stage record in `types.ts`, and the prose the backend composes — into it, and
rewrite the Russian so that strings which render together read as one voice.

## Technical Context

**Language/Version**: TypeScript 6, React 19, Mantine 9; Python 3.13, FastAPI, Pydantic.

**Primary Dependencies**: none added. An i18n library would bring a plural engine we already have
in eleven lines and a loader the constitution forbids reaching the network for.

**Storage**: none.

**Testing**: Playwright for the rendered result (the language is chosen in a browser, from
`navigator.languages` and `localStorage`, and neither behaves like itself outside one); pytest for
the keys and variables the backend now emits.

**Target Platform**: unchanged.

**Performance Goals**: unchanged. The placeholder regex runs once per rendered string.

**Constraints**: the column header is 246px of content at the narrow width, and feature 011 was
spent on cards that outgrew it — so translated stage labels get a truncation guard rather than a
promise that they fit.

**Scale/Scope**: one dictionary rewritten, ten components, five backend modules, three test files.

## Constitution Check

**PASS.**

- **I. Read-only** — nothing here opens a scanned path at all. The change is what SpecDash says
  about what it read.
- **II. The files are the truth** — this is where the feature had to be careful. Evidence strings
  stay in the scanner's own words (FR-003), because a card's explanation of where it sits must
  keep matching the document it cites. Findings are translated, and their `code` — the stable
  thing an API consumer keys on — is unchanged; the English `message` is still emitted beside the
  new key, so nothing that reads the API loses a sentence it had.
- **III. One malformed file may not blank the board** — a finding whose key is unknown to the
  dictionary renders the English `message` the backend still sends. An unknown key degrades to a
  readable sentence, never to a dotted id or a blank panel.
- **IV. A project is a directory** — untouched.
- **V. Live** — untouched.
- **VI. One command, one container, no internet** — preserved deliberately: no i18n library, no
  font, no CDN. `Intl` is in the browser already.
- **VII. The portfolio question first** — untouched.

## Approach

**Declension in the template, not at the call site.** `translate()` gains two placeholder forms
beside the plain one: `{count:task}` prints the number and its agreeing noun, `{total#task}`
prints only the noun, for the `{done}/{total} задачи` shape where the number is already on screen.
This is what lets `(s)` and the inverted `Существительных: {count}` headings both go without
rewriting ten components — the fix lands in the dictionary, where the grammar problem is.

**A total Russian dictionary.** `RU` stops being `Partial<Record<Key, string>>`. The English
fallback stays for safety at run time, but a key added to `EN` and forgotten in `RU` is now a
compile error rather than a silent English label nobody notices.

**Backend prose becomes a key and its variables.** `Finding` gains `message_key` and `vars`;
`ProjectHistory.reason` gains `reason_key`; artefact labels gain `label_key`. The English
`message` / `reason` / `label` are still composed exactly as before, so the API is unchanged for
anything that reads it and the frontend has a fallback for a key it does not know.

**Locale reaches the formatters.** `formatBytes` takes the language; the trend chart's dates take
it; the header's scan duration goes through `toLocaleString`; and the history tab stops rendering
git's own `--date=relative` output, which was English regardless of the reader, in favour of the
`time.*` block that already exists.

**The Russian rewrite is by group, not by string.** Six empty states get one construction, six
hints get one, three verdicts get one part of speech and one gender. That is what makes the board
read as written rather than as translated.

## Verification

- Playwright, extended: the counted-noun test gains the 2/5/11/21 forms, and a new test sweeps a
  Russian board for Latin text with the documented exceptions allowed.
- pytest for the new backend keys and their variables.
- `tsc -b`, `eslint`, `ruff`.
- The author's real root, read end to end in Russian.

## Risks

**Translated column headers could overflow the column.** `Спецификация` is the longest label and
the header row is `nowrap`. Guarded rather than hoped: `.stageName` truncates, and the layout test
from feature 011 already fails on any element that outgrows its column.

**Two placeholder operators are a small language.** They are documented in the file, used only in
the dictionary, and the regex falls through to plain substitution for anything it does not
recognise — an unparsed placeholder renders as itself rather than throwing.

**Translating findings could drift from what the backend says.** Mitigated by keeping the code and
the English message on the wire: the two can be compared, and the fallback path is the sentence
the backend wrote.

## Complexity Tracking

*No constitutional violations are claimed for this feature.*

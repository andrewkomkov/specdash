---
description: "Implementation plan for keeping every card inside its column"
---

# Implementation Plan: A card stays in its column

**Branch**: `011-a-card-stays-in-its-column`

**Input**: [spec.md](./spec.md)

## Summary

Give the column a ceiling the cards cannot exceed, then make the two `nowrap` rows that were
hitting it lay themselves out narrower instead: the documents footer wraps, and the project badge
truncates.

## Technical Context

**Language/Version**: TypeScript 6, React 19, Mantine 9.

**Primary Dependencies**: none added.

**Storage**: none.

**Testing**: Playwright. The property is geometric — a card's box against its column's box — so it
is measured in a real browser rather than asserted about class names. The fixture needed a card
whose footer is genuinely too wide, which it did not have: `atlas/001` gains a `contracts/`
directory, which is a spec-kit artefact the scanner already reads and the e2e suite did not
previously cover.

**Target Platform**: unchanged.

**Performance Goals**: unchanged; this is layout, not work.

**Constraints**: below 1500px the columns are a fixed 270px, so a card has a 210px content box —
narrower than the footer's 240px intrinsic width. The fix must hold at that width and must not
change the layout above it, where the footer fits on one line.

**Scale/Scope**: four components' worth of CSS and props, one fixture file, one new spec.

## Constitution Check

**PASS.**

- **I. Read-only** — nothing here writes anywhere; the new fixture file is under `e2e/fixtures`,
  which is this repository's own, not a scanned project's.
- **II. The files are the truth** — untouched: this changes how a card is drawn, never what it
  claims. The wrapped footer keeps every figure it had, so no evidence is dropped to fit.
- **III. One malformed file may not blank the board** — the same argument one layer up: one long
  string may not break the board's layout. That is exactly what was happening.
- **IV–VII** — untouched.

## Approach

**The ceiling.** `.column > * { min-width: 0 }` already existed but stops at the scroll area.
Mantine's `ScrollArea` sizes its content element to `min-content`, so the widest card set the
width of the stack. The `content` slot gets `min-width: 0` through `classNames`, which is the
supported seam — no `:global` reach into Mantine's internals.

**The footer.** Drop `wrap="nowrap"` from the outer footer `Group`. The icons keep their own
`nowrap` row — they are a fixed sequence and must stay one — but the age drops below them when the
two do not fit. `.footerMeta` gains `margin-inline-start: auto` so it holds the right edge on
either layout; `justify="space-between"` only does that on the first line.

**The project badge.** Mantine's badge already ellipsises its label and is already `flex: 0 1
auto`; what stops it shrinking is `min-width: auto` on a flex item. A `.projectPill` class sets
`min-width: 0`. The story card was applying `.pill` — `flex: none; overflow: visible`, written for
the footer's fixed-width figures — to a name, which is the opposite of what a name wants.

## Verification

- The new Playwright spec, run against the pre-fix build first: it must fail, in English and in
  Russian, before it is allowed to pass.
- The whole e2e suite.
- The author's real root at 1440px, in both grains and in Russian — the board in the report.

## Risks

**The regression test may not reproduce.** The fixture's project ids are short and its English
dates are narrow, so the pre-fix board fits inside 270px by four pixels and proves nothing. Hence
the contracts file: it adds the badge that takes the footer past the edge. Confirmed by running
the new spec against the pre-fix build, where it fails on both languages.

**Wrapping could turn every card a line taller.** It does not: above 1500px the columns grow and
the footer returns to one line. Below it, the second line is the cost of not clipping the figure.

## Complexity Tracking

*No constitutional violations are claimed for this feature.*

# Feature Specification: A card stays in its column

**Feature Branch**: `011-a-card-stays-in-its-column`

**Created**: 2026-08-16

**Status**: Implemented

**Input**: A screenshot of the board at 1440px in Russian: cards in Implement drawn wider than
the column that holds them, titles and badges cut off at the column edge, a horizontal scrollbar
inside a column that has no business scrolling sideways.

## Overview

The board is six columns, and the column a card sits in *is* the claim the board makes about it.
A card wider than its column stops making that claim: it lies across the neighbour, its right-hand
content is clipped mid-word, and the six columns read as one smeared row.

Two things caused it, and both had to be fixed.

**The card had no ceiling.** Mantine sizes a `ScrollArea`'s content to `min-content`. The column
already carried `min-width: 0` on its own children — the defence written when the findings badge
last did this — but the cards live one level deeper, inside the scroll area, where that rule does
not reach. So the widest card in a column set the width of the stack, and the stack overflowed the
column.

**The card asked for more than 270px.** Two rows were laid out `nowrap`, and their content is not
fixed:

- the documents footer — four artefact icons, a contracts count, a checklist figure and the age of
  the feature. At `2c`, `100%` and `3 дн назад` it needs 240px of a 210px content box.
- the story card's header — story id, project id, `current`. `poraOtdihat` fits;
  `google_health_strava` does not, and the badge was told to keep its intrinsic width, so it grew
  the card and then overprinted `current`.

The first is the guard, the second is the reason the guard was being hit. A guard alone would have
clipped the age off the card; the layout changes alone would have left the next long string free
to push a card out again.

### Why this is worth fixing rather than tolerating

It is not a cosmetic wobble. The board's one job is to say which stage a feature is at, and it
says it by position. A card drawn over the boundary reports the wrong stage to anyone reading
quickly, and the content it loses at the clip is the content that says how much is done.

The widths that broke it are all *content* — a Russian date, a long project id, a feature that
happens to have both contracts and checklists. None of them are exotic, and the next one is
already being typed into somebody's `spec.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every card is inside the column that placed it (Priority: P1)

Someone opens the board and reads it by column. Every card is drawn within the bounds of its
column, whatever the length of the strings inside it.

**Why this priority**: it is the defect that was reported, and it is the property the board's
whole layout rests on.

**Independent Test**: measure each card's box against its column's box; nothing may cross the
edge, and no element inside a column may have grown enough to scroll sideways.

**Acceptance Scenarios**:

1. **Given** a feature with contracts, checklists and four documents, **When** the board is drawn
   at the narrow column width, **Then** the card fits inside its column.
2. **Given** the interface in Russian, whose dates and labels are longer than the English ones,
   **When** the board is drawn, **Then** no card crosses its column's edge.
3. **Given** the story grain, **When** the board is drawn, **Then** no story card crosses its
   column's edge.
4. **Given** a card too narrow for its footer, **When** it is drawn, **Then** the footer wraps and
   keeps every figure it carries, rather than losing the age off the clipped edge.

### User Story 2 - A long project id is cut, not honoured (Priority: P2)

Someone with a project called `google_health_strava` reads the story board and sees the project
badge ellipsised, with the `current` badge beside it intact and legible.

**Why this priority**: it is a narrower case than US1 and only bites boards that show the project,
but it is the one that produced overlapping text rather than merely a wide card.

**Independent Test**: on a board whose project ids exceed the badge's share of the header row,
confirm the badge truncates and the badges beside it keep their width.

**Acceptance Scenarios**:

1. **Given** a project id longer than the header row can hold, **When** the card is drawn,
   **Then** the id is truncated with an ellipsis and no badge overprints another.

### Edge Cases

- A wide viewport, where columns are `1fr` and grow past 300px: the footer must return to one line
  rather than staying wrapped.
- A card with no contracts and no checklists: the footer is short and must not gain a second line.
- A project id short enough to fit: it must not be truncated, and nothing may reserve room as if it
  might be.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A card MUST NOT be drawn wider than the column it is placed in, whatever the length
  of its content.
- **FR-002**: No element inside a column may overflow it horizontally — a column scrolls
  vertically and in no other direction.
- **FR-003**: The documents footer MUST keep every figure it carries when it does not fit on one
  line, wrapping instead of being clipped.
- **FR-004**: The age of the feature MUST stay at the card's right edge, on one line and on two.
- **FR-005**: A project id too long for its row MUST be truncated with an ellipsis rather than
  widening the card or overprinting the badges beside it.
- **FR-006**: Where the content does fit, the layout MUST be unchanged from today's.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every card on the board, in both grains and in both languages, the card's box is
  within its column's box.
- **SC-002**: No element inside a column reports `scrollWidth > clientWidth`.
- **SC-003**: The reported board — the author's real root at 1440px in Russian — draws every card
  inside its column, including the `google_health_strava` story cards.

## Assumptions

- Wrapping the footer is the right answer rather than shortening what it says. The contracts count
  and the checklist figure are the two facts that row exists to carry, and a card that drops them
  to stay on one line is a worse card than one that is a line taller.
- A project id may be truncated because it is a name and the board repeats it on every card; a
  count or a percentage may not, because a truncated figure is a wrong figure.

## Dependencies

- None. Frontend layout only; the scanner and the API are untouched.

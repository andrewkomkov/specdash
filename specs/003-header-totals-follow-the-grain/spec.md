# Feature Specification: The header total counts what is on screen

**Feature Branch**: `003-header-totals-follow-the-grain`

**Created**: 2026-08-07

**Status**: Implemented

**Input**: User description: "давай счетчик тоже сделай по режиму"

## Overview

The header carries one number for the whole board — `462/504 задач`, a bar and a
percentage. It is summed over features regardless of which grain the board is being read
at, while the badge beside it already follows the grain (`20 фич` / `70 историй`). Two
neighbouring numbers answering to different things is exactly the kind of quiet
disagreement this tool is supposed to catch rather than commit.

The total should be summed over the cards actually on screen, as the per-column totals
already are.

**A note on what this will and will not change.** Without a search filter the two sums are
equal by construction: a feature's stories plus its leftover bucket sum to its task total,
which is the identity feature 002 exists to preserve. So on an unfiltered board the number
will not move — and if it ever does, something upstream is wrong. The visible difference
appears when a search is active, because the two grains match different things: at feature
grain the needle is matched against task descriptions and summaries, at story grain against
story titles. Today the counter keeps reporting the feature-grain sum in both cases.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One header, one subject (Priority: P2)

Someone searching at story grain narrows the board to a few stories and reads the header to
see how much of *that* is done. Today the header answers a question they did not ask —
about features, some of which are not on the board.

**Why this priority**: A wrong number in a corner, not a missing capability. Worth fixing
because a number that silently answers a different question is worse than no number, but it
does not block anything.

**Independent Test**: Search for a term at story grain and confirm the header total equals
the sum of the visible story cards, and the badge and the total describe the same set.

**Acceptance Scenarios**:

1. **Given** the board at story grain with no search, **When** the header is read, **Then**
   the total equals the feature-grain total — the two sums agree by construction.
2. **Given** a search that matches some stories, **When** the board is at story grain,
   **Then** the header total counts only those stories' tasks.
3. **Given** the same search, **When** the grain is switched to features, **Then** the total
   counts the matching features' tasks instead, and both the badge and the total change
   together.
4. **Given** the trend view, **When** the header is read, **Then** the total is the
   feature-grain sum, because the trend is drawn per project and per feature.

## Requirements *(mandatory)*

- **FR-001**: The header total MUST be summed over the cards the current grain is showing,
  after the project filter and the search have been applied.
- **FR-002**: The header total and the card-count badge MUST always describe the same set.
- **FR-003**: The total MUST name what it counts, so that "tasks of the stories shown" is
  not mistaken for "tasks of the projects".
- **FR-004**: The trend view MUST keep the feature-grain total; it draws per project, not
  per story.
- **FR-005**: No new data and no new request: both sums come from the snapshot already held.

## Success Criteria *(mandatory)*

- **SC-001**: On an unfiltered board, switching grain leaves the header total unchanged.
- **SC-002**: With a search active, the header total equals the sum of the visible cards at
  either grain.
- **SC-003**: A backend test asserts the identity SC-001 relies on, so a regression that
  breaks it is caught where it happens rather than as a number nobody can explain.

## Edge Cases

- A search matching nothing: the total is `0/0` and the bar is not drawn, as today.
- A feature with tasks but no stories at all: its leftover bucket carries them, so the sums
  still agree.
- All projects hidden by the chip filter: both grains sum to zero.

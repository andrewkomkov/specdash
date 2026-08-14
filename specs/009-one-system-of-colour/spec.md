# Feature Specification: One system of colour

**Feature Branch**: `009-one-system-of-colour`

**Created**: 2026-08-14

**Status**: Implemented, bar the screenshots in T043

**Input**: User description: "мб как-то дашборд сделать попривлекательнее" — plus a Fundraise Up
brand kit, whose whole palette is two colours: `#2BB77B` and `#373B46`.

## Overview

The board is not ugly. It is *incoherent*, and the incoherence is specifically about colour: three
independent systems run at once and none of them is the one a reader needs.

**Colour currently encodes rank, not state.** Every finished feature in the Done column is covered
in red and orange badges — `US1·P1 100%` red, `US2·P2 100%` orange — because the hue is the story's
*priority*. Completed work therefore reads as an emergency. At the same time `progressColor()` runs
a traffic light over progress: 0% grey, under 25% orange, under 60% yellow. A feature that has
merely started is painted the colour of a warning.

**Project identity is assigned by hash.** `projectColor()` hashes the project id into a cycle of
ten hues. That breaks two rules at once: a categorical palette must be assigned in fixed order and
never cycled, and — more seriously — with eight projects on screen, any two can be adjacent, so
every pair must be distinguishable. Past three slots that is not achievable in any ordering. The
current ten include red, orange and yellow, which are the colours a finding needs.

**The important number is the smallest thing on the page.** `491/564 · 87%`, the state of the whole
portfolio, is set at 11px in a corner, below the size of every card title.

**One number is drawn twice.** Each card carries a `94%` ring and, directly beneath it, a bar
saying the same thing. On a 250px card that is half the visual weight spent on a duplicate.

**The columns do not read as a pipeline.** Six identical grey containers in a row; an empty one is
a third of the screen saying "empty".

### The thesis

Hue is a scarce resource and it is currently spent on identity. This feature spends it on **where a
feature is and whether it is in trouble**, and pays for that by taking it away from priority and
from project identity — both of which already carry their own labels.

| Role | Job | Encoding after this change |
|---|---|---|
| Stage | ordered position in the pipeline | one sequential ramp, slate → brand green |
| Progress | magnitude | bar length, in a single hue |
| Findings | status | reserved red / amber / grey, **always with an icon and a word** |
| Priority | ordinal, secondary | type weight and neutral ink — no hue |
| Project | identity | its name — no hue |

This is what the constitution already asks for and does not currently get: *"a colour, a column and
a badge mean the same thing everywhere, so two projects can be read side by side"* (Principle VII).
A hue that means "project #4 by hash" in one place and "priority 1" in another means nothing.

### What the brand supplies, and what it does not

The kit is two colours and a set of logos. `#2BB77B` becomes the single hue of progress and the far
end of the stage ramp; `#373B46` becomes the neutral family that the surfaces and the near end of
the ramp are built from. That is the whole of it — the brand does not supply a status palette, a
type scale or a chart palette, and this feature does not invent brand meaning for them.

**The logo is deliberately not used.** SpecDash is a public repository published to GitHub Pages and
ghcr.io; putting a company's mark on it is a statement made on that company's behalf. Adopting the
palette is a design decision, shipping the logo is a claim, and only the first is this feature's to
make.

### Red and green cannot be told apart, so they never carry meaning alone

Measured rather than assumed. Brand green against a candidate status red, on the dark surface:

```
[WARN] CVD separation   worst all-pairs #E5484D↔#2BB77B ΔE 7.1 (deutan)
```

Below the 8.0 target. Re-stepping either colour did not fix it, and adding amber made it worse — a
red/amber/green trio fails these floors in every ordering, which is what makes traffic lights a
poor interface. "Done" and "blocked" are the two states on this board that must never be confused,
so **status is never encoded by colour alone**: every finding carries an icon and a word, and the
colour only reinforces them.

The stage ramp was validated separately and passes as a sequential ramp — monotonic in lightness
and clear of the contrast floor in both modes:

| Mode | Steps | OKLab L | Contrast |
|---|---|---|---|
| dark, surface `#14161A` | `#5A6478 #3D7A73 #2F8F76 #26A276 #22B47D #4ACF9B` | 0.502 → 0.768, increasing | all ≥ 3:1 |
| light, surface `#FFFFFF` | `#7E8AA2 #5F958C #3E9276 #2A8A64 #1E7A55 #14603F` | 0.632 → 0.435, decreasing | all ≥ 3:1 |

Adjacent steps of a sequential ramp are close by construction and are not held to the categorical
separation floor: on this board a stage is named by its column, and the colour repeats what the
position already says.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Finished work stops looking like an emergency (Priority: P1)

Someone opens the board and sees the Done column. Today it is a wall of red and orange. It should
read as the calmest part of the screen.

**Why this priority**: it is the single most misleading thing on the page, and it is the reason the
board does not look finished even when the work is.

**Independent Test**: open a board whose Done column holds several fully ticked P1 features and
confirm that no alarm colour appears anywhere in it, while a feature with a real blocker elsewhere
is immediately findable.

**Acceptance Scenarios**:

1. **Given** a fully ticked feature whose stories are all priority P1, **When** the board is drawn,
   **Then** no red or amber appears on its card.
2. **Given** a story of priority P1 and one of P3 on the same card, **When** the board is drawn,
   **Then** the two are distinguishable from each other without either using a status colour.
3. **Given** a feature carrying a blocker-severity finding, **When** the board is drawn, **Then**
   its badge is the only alarm-coloured thing on that card, and it carries an icon and a word as
   well as a colour.
4. **Given** a viewer with deuteranopia, **When** they look at a card with a blocker and a card at
   100%, **Then** they can tell the two apart from the icon and the text without relying on hue.
5. **Given** a feature at 12% progress, **When** the board is drawn, **Then** its bar is short and
   in the progress hue — not orange, which would mark early work as a problem.

### User Story 2 - The board leads with the number it exists to report (Priority: P1)

The portfolio question — how much of all this is done — should be answerable from across the room.

**Why this priority**: Principle VII says the board answers the portfolio question first, and the
header currently answers it in 11px type.

**Independent Test**: open the board and confirm the overall completion figure is the largest
number on screen and legible at a glance.

**Acceptance Scenarios**:

1. **Given** any board with tasks, **When** it is drawn, **Then** the overall percentage is set at
   the display size of the type scale and is the largest number on the page.
2. **Given** the header, **When** it is drawn, **Then** the done/total count and the feature count
   sit beside that percentage as supporting figures rather than competing with it.
3. **Given** a filter that changes which cards are shown, **When** it is applied, **Then** the
   headline figure describes exactly the cards on screen, as it does today.

### User Story 3 - The pipeline reads as a pipeline (Priority: P2)

Six columns should look like a sequence with a direction, and an empty one should say something
useful.

**Why this priority**: real gain in legibility, but nothing is actively *wrong* today.

**Independent Test**: open a board with an empty Clarify column and confirm the columns read
left-to-right as a progression and the empty one explains itself.

**Acceptance Scenarios**:

1. **Given** the six columns, **When** they are drawn, **Then** each carries its own step of the
   stage ramp, and the ramp advances from left to right.
2. **Given** a column with no cards, **When** it is drawn, **Then** it states what would put a card
   there rather than only the word "empty".
3. **Given** any column, **When** it is drawn, **Then** its heading, count and column total remain
   exactly as informative as they are today.

### User Story 4 - A card says one thing once (Priority: P2)

**Why this priority**: the duplicate ring is the largest single waste of space on a card, and
removing it is what makes room for everything else.

**Independent Test**: open a card at 59/63 and confirm the completion figure appears once.

**Acceptance Scenarios**:

1. **Given** a feature with tasks, **When** its card is drawn, **Then** progress is shown once.
2. **Given** a card, **When** it is drawn, **Then** the title is the most prominent element on it.
3. **Given** a card, **When** it is drawn, **Then** the artefact icons, counts and timestamp
   occupy one row.
4. **Given** the drawer for the same feature, **When** it is opened, **Then** the ring may remain
   there, where there is room for it and only one feature is in view.

### User Story 5 - The trend view belongs to the same application (Priority: P3)

**Why this priority**: it is a second screen, reached deliberately, and it is currently readable —
just visibly from a different design.

**Independent Test**: switch to Trend and confirm it uses the same palette, grid and type scale as
the board.

**Acceptance Scenarios**:

1. **Given** a project chart, **When** it is drawn, **Then** its series use the same progress hue
   as the board and sit on a recessive grid with labelled axes.
2. **Given** two series on one chart, **When** it is drawn, **Then** a legend is present, so
   identity is never carried by colour alone.
3. **Given** any chart, **When** it is drawn, **Then** it has one value axis — never two.

### Edge Cases

- A project whose name is long: identity is the name, so the name must not be truncated to
  something ambiguous where two projects share a prefix.
- More than six stories on a card: priority is no longer a hue, so the overflow indicator has to
  survive without one.
- Forced-colours / high-contrast mode: the ramp collapses, so column position and the stage label
  must carry the meaning on their own.
- A viewer who has set light mode explicitly while the OS is dark, and the reverse: both ramps are
  selected sets, not automatic inversions of each other.
- A card carrying both a blocker and a 100% bar — the state this feature exists to make legible.
- Reduced motion: the existing flash-on-change must keep its non-animated fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Colour MUST be assigned by the job it does, and each of the five roles — stage,
  progress, status, priority, project — MUST have exactly one encoding, used everywhere.
- **FR-002**: Status colours MUST be reserved for findings and MUST NOT be used for any other role.
- **FR-003**: A status MUST NEVER be conveyed by colour alone; every finding carries an icon and a
  word as well.
- **FR-004**: Priority MUST be shown without hue, using type weight and neutral ink.
- **FR-005**: Project identity MUST be carried by the project's name rather than by a generated
  hue, and `projectColor` MUST be removed rather than left unused.
- **FR-006**: Progress MUST be a single hue at one step, with length carrying the magnitude, and
  MUST NOT change hue with the value.
- **FR-007**: Stage MUST use a six-step sequential ramp, defined per colour scheme as a selected
  set rather than derived by inversion.
- **FR-008**: Both ramps MUST be monotonic in lightness and MUST clear 3:1 contrast against their
  own surface, verified by the validator rather than by eye.
- **FR-009**: The interface MUST define a type scale of 11 / 13 / 15 / 20 / 28 px and use it.
- **FR-010**: The overall completion percentage MUST be set at the display size and MUST be the
  largest number on the board.
- **FR-011**: Each column MUST carry its own step of the stage ramp, advancing left to right.
- **FR-012**: An empty column MUST state what would put a card in it.
- **FR-013**: A card MUST show its progress exactly once.
- **FR-014**: A card's title MUST be its most prominent element.
- **FR-015**: A card's artefacts, counts and timestamp MUST occupy a single row.
- **FR-016**: The drawer MUST lay its overview out in columns on a wide viewport rather than as one
  full-width ribbon.
- **FR-017**: Trend charts MUST use the progress hue, a recessive grid, labelled axes and a legend
  wherever more than one series is drawn.
- **FR-018**: No chart may carry two value axes.
- **FR-019**: Colour roles MUST be defined as CSS custom properties in one place, with the dark
  values declared for both the OS setting and an explicit theme choice.
- **FR-020**: Every existing behaviour MUST survive: placement, evidence strings, both grains,
  search, the drawer's tabs, live updates and the language toggle.
- **FR-021**: The board MUST remain read-only in appearance as well as in fact — nothing added here
  may look editable.
- **FR-022**: The reduced-motion fallback for the change flash MUST be preserved.
- **FR-023**: The Fundraise Up logo MUST NOT be added to the repository or the image.

### Key Entities

- **Colour role**: one of stage, progress, status, priority, project — a job, its encoding, and the
  rule that keeps it from being borrowed for another job.
- **Stage ramp**: six selected steps per colour scheme, monotonic in lightness, validated against
  that scheme's surface.
- **Type scale**: five sizes, from caption to display, replacing the ad-hoc `10px`/`11px` literals
  currently scattered through the components.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No red or amber pixel appears in a Done column of fully ticked features.
- **SC-002**: Both stage ramps pass the validator's lightness-monotonicity and contrast checks
  against their own surfaces, and the check is recorded rather than asserted.
- **SC-003**: The overall percentage is the largest numeral on the board, measured in rendered px.
- **SC-004**: A card at 250px width fits its title, one progress reading, its stories and one
  footer row without clipping.
- **SC-005**: The whole existing Playwright suite passes unchanged except where a test asserts on a
  colour this feature deliberately changes.
- **SC-006**: The built CSS grows by no more than 4 KB gzipped.
- **SC-007**: `projectColor` no longer exists in the source.

## Assumptions

- The two brand colours are the whole brand palette; no secondary or tint scale was supplied, so
  the neutral family is derived from `#373B46` rather than invented alongside it.
- Mantine stays. The redesign is expressed as a theme plus CSS custom properties, not as a
  replacement component library — a rewrite would put every behaviour in Principle-scope for
  regression and buy nothing this feature needs.
- Light mode remains supported and is a selected palette, not an inversion.

## Dependencies

- Feature 008 shipped the findings model this feature gives the status role to.
- No new runtime dependency, on either side.

# Feature Specification: Read the board at story grain

**Feature Branch**: `002-board-at-story-grain`

**Created**: 2026-08-07

**Status**: Implemented — written after the code, and ticked against it

**Input**: User description: "слуш а можно как-то US чтоб тоже можно было на доске показывать (а то когда только спеки целиком — какая-то маленькая доска) но чтоб и текущий режим можно было вернуть — удобно смотреть только спеки когда много проектов. И еще — непонятно а что оно за 25 из 25?"

## Overview

The board draws one card per feature. That is the right density when several repositories
are open at once and the question is "which project needs me". It is the wrong density
when a root holds a handful of features: six columns hold a dozen cards, most columns are
empty, and all the work — the user stories the features are actually made of — is hidden
one click deep.

This feature lets the same board be read at two grains. *Фичи* is what exists today.
*Истории* draws one card per user story, each placed in the column its own ticked tasks
justify rather than its feature's. The two are a switch, not a replacement: the feature
grain remains the default and remains better when many projects are open.

Nothing new is read off disk. Every number here already exists in `tasks.md`; the feature
is about which of them the board is allowed to draw.

**Written after the code.** This folder documents work that was built and released before
it was specified — see [Retrospective note](#retrospective-note). Every checkbox in
`tasks.md` is a claim about code that exists.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the work, not just the features (Priority: P1)

Someone with two or three spec-kit projects open wants the board to show what is actually
being worked on. At feature grain the board says "one card, 59/63". At story grain it says
which three stories that feature is made of, which are finished and which is the one still
moving.

**Why this priority**: This is the whole request. Without it the switch has nothing to
switch to.

**Independent Test**: Switch to story grain on a root holding a few features and confirm
every user story of every feature appears exactly once, in the column its own ticked tasks
justify, with counts matching a manual read of the `[US#]` tags in `tasks.md`.

**Acceptance Scenarios**:

1. **Given** a feature whose US1 is fully ticked and whose US2 is half done, **When** the
   board is read at story grain, **Then** US1 sits in Done and US2 sits in Implement,
   regardless of where the feature as a whole sits.
2. **Given** a feature with no `tasks.md`, **When** the board is read at story grain,
   **Then** its stories appear in the feature's own column and each says why it is there.
3. **Given** a story card, **When** it is clicked, **Then** the feature opens with that
   story expanded rather than at the top of the overview.

### User Story 2 - Keep the feature grain a click away (Priority: P1)

The person asking for story grain also said the feature grain is what they want when many
projects are open. Neither is a mode to be talked into; both are one click apart, and the
board opens in whichever was last used.

**Why this priority**: A view that replaces the old one is a regression for the case the
old one served. Shipping the switch without persistence would make the user re-choose on
every reload.

**Independent Test**: Switch grain, reload the page, and confirm the board comes back in
the grain last chosen.

**Acceptance Scenarios**:

1. **Given** the board at story grain, **When** the page is reloaded, **Then** it is still
   at story grain.
2. **Given** a search term, **When** the grain is switched, **Then** the term still
   applies, matching story titles as well as feature titles.

### User Story 3 - Do not lose the work that names no story (Priority: P2)

Setup, foundational and polish phases carry real tasks that name no user story — 24 of this
project's own 83. A board of stories that simply drops them shows column totals that do not
add up to the feature's, which is exactly the kind of quiet disagreement this tool exists
to catch.

**Why this priority**: Correctness of the totals, not a new capability. Worth less than the
board itself but more than polish.

**Independent Test**: For any feature, confirm the sum of its stories' task totals plus the
leftover bucket equals the feature's own task total.

**Acceptance Scenarios**:

1. **Given** a feature whose `tasks.md` has phases with no `[US#]` tag, **When** the board
   is read at story grain, **Then** those tasks appear as one card and the column totals
   account for them.
2. **Given** that card, **When** it is clicked, **Then** the feature opens on its task list
   rather than on an overview panel that has no row for it.

### User Story 4 - Say what a number counts (Priority: P3)

A story row in the drawer read `25/25` with nothing to say what was being counted — tasks,
scenarios, requirements or checklist items were all plausible readings.

**Why this priority**: A one-line defect in a shipped screen, raised in the same breath as
the feature. Cheap, and a number nobody can interpret is worse than no number.

**Independent Test**: Open any feature with stories and confirm the counter names its unit.

**Acceptance Scenarios**:

1. **Given** a story with tasks, **When** the overview is shown, **Then** the counter reads
   `25/25 задач` and names the tag it counted on hover.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The board MUST offer a story grain alongside the feature grain, switched from
  the header, with the feature grain as the initial default.
- **FR-002**: The chosen grain MUST survive a reload, stored in the browser rather than on
  disk — SpecDash writes nothing to a scanned project (Constitution I).
- **FR-003**: A user story MUST be placed by its own ticked tasks, using the same evidence
  rule that places a feature, so the two cannot disagree about what a checkbox means.
- **FR-004**: The placement rule MUST live in one place. A rule expressed once in Python and
  again in TypeScript is a rule that will drift.
- **FR-005**: A story with no tasks of its own MUST sit where its feature sits and MUST say
  which reason applies — the work has not been cut into tasks yet, or it has and no task
  names this story.
- **FR-006**: Every story card MUST carry its evidence, as every feature card already does
  (Constitution II).
- **FR-007**: Tasks belonging to no story MUST be represented, so that per-column totals at
  story grain account for every task the feature grain counts.
- **FR-008**: A story card MUST open its feature with that story expanded; the leftover
  bucket, which has no such row, MUST open the task list instead.
- **FR-009**: Search MUST match story titles at story grain, in addition to the feature
  fields it already matches.
- **FR-010**: Per-story counters MUST name what they count.
- **FR-011**: The story grain MUST NOT read anything further off disk, nor cost an extra
  request: it is a second reading of the snapshot already broadcast.

### Key Entities

- **User story**: gains a stage and an evidence string, exactly as a feature has.
- **Leftover bucket**: a story-shaped record standing for the tasks that name no story;
  carried beside the stories rather than mixed into them, so existing readers of the story
  list are unaffected.

## Success Criteria *(mandatory)*

- **SC-001**: On a root of five projects and 19 features, the story grain draws 65 cards
  where the feature grain draws 19, with no column left empty that has work in it.
- **SC-002**: For every feature on the board, stories plus leftover bucket sum exactly to
  the feature's task total.
- **SC-003**: Switching grain redraws from the snapshot already held — no new request, no
  rescan, no measurable pause.
- **SC-004**: Every story card states why it sits in its column, in the same vocabulary the
  feature cards use.
- **SC-005**: The grain chosen survives a reload.

## Edge Cases

- A feature with no user stories at all: contributes only its leftover bucket, if it has
  tasks, and nothing otherwise.
- A story that exists only in `tasks.md` and not in `spec.md`: already synthesised by the
  scanner, and placed by the same rule as any other.
- A feature whose every task names a story: no leftover card is drawn rather than an empty
  one.
- A story whose feature is Done but which names no task: sits in Done with a reason saying
  no task named it, rather than implying it was built.
- Two projects each with a `US1`: card keys are qualified by project and feature, so they
  do not collide.

## Retrospective note

This specification was written after the feature shipped, when the omission was noticed:
the board was showing SpecDash's own project as 100% Done while the running container held
a capability no spec, plan or task list mentioned. That is precisely the prose-versus-
artefact disagreement the tool exists to surface, and it was pointing at itself.

The tasks in `tasks.md` are therefore ticked against code that already exists rather than
planned ahead of it. The honesty rule is unchanged — a checkbox is a claim about code, and
every one of these claims was checked before it was ticked.

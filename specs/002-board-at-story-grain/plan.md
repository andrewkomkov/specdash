# Implementation Plan: Read the board at story grain

**Branch**: `002-board-at-story-grain` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-board-at-story-grain/spec.md`

## Summary

The scanner already attributes every task to the story named in its `[US#]` tag. This
feature gives each `UserStory` a stage and an evidence string, derived by the same rule
that places a feature, and carries the tasks that name no story as a story-shaped record
beside the list. The frontend gains a second reading of the same snapshot: a third position
in the header switch, a story card, and a story board reusing the existing column shell.
No new endpoint, no new request, nothing further read off disk.

## Technical Context

**Language/Version**: Python 3.13 (backend), TypeScript 5.8 / React 19 (frontend)

**Primary Dependencies**: unchanged. This feature adds no dependency to either half.

**Storage**: None, as before. The chosen grain is a browser preference in `localStorage` —
deliberately not a file, because SpecDash writes nothing into a scanned project.

**Testing**: pytest over the fixture workspace in `backend/tests/`, extended with the story
placement rule, the "no task names this story" case, and the totals identity.

**Target Platform**: unchanged — one container, one port.

**Project Type**: web

**Performance Goals**: switching grain must not touch the network. Both grains are derived
from the snapshot already in memory in the browser.

## Where the rule lives, and why

The obvious shortcut is to derive a story's column in the frontend: the tick counts are
already in the snapshot, and it is four lines of TypeScript. It was rejected.

`_decide_stage` in `backend/app/scanner.py` is the single answer to "where does this belong
and why". A second copy in TypeScript would be correct on the day it was written and would
drift on the first change to either — and the failure mode is a card in the wrong column
with a plausible-looking reason underneath, which is the hardest kind of wrong to notice.
So `_story_stage` sits next to `_decide_stage`, shares its vocabulary of evidence strings,
and the frontend renders what it is told.

The cost is two fields on `UserStory` in the snapshot. That is a fair price.

## The tasks that name no story

Setup, foundational and polish phases carry tasks with no `[US#]`. Three options were
considered:

1. **Drop them.** Rejected: the per-column totals stop equalling the feature grain's, and a
   board that quietly disagrees with itself is worse than one extra card.
2. **Attribute them to the feature's first story.** Rejected outright: it invents a claim
   the files do not make (Constitution III — tolerant parsing must not become inventive).
3. **Carry them as their own record.** Chosen. `Feature.unassigned` is an optional
   `UserStory` with id `—`, populated only when such tasks exist, and left out of
   `user_stories` so that every existing reader of that list — the card badges, the drawer
   accordion, the story task attribution — is untouched.

Its card has no row in the overview accordion to expand, so clicking it opens the task list
instead of a panel that would ignore the click.

## Frontend shape

- `Board.tsx` keeps one `Column` shell and grows a second exported board, `StoryBoard`,
  differing only in what it filters and what it renders. Duplicating the column chrome for
  the sake of a flat component tree was not worth the second place to fix a style.
- `StoryCard.tsx` reuses `FeatureCard.module.css`. Two card types with independently
  drifting hover, accent and flash styling is a maintenance trap for no visual gain.
- The header control becomes three-way — `Фичи · Истории · Динамика` — rather than growing
  a second control. Grain and view are one choice from the reader's side: what is on the
  screen.
- The choice moves from `useState` to `useLocalStorage`, alongside the existing hidden-
  projects filter. Which grain someone works at is a standing preference.

## Complexity Tracking

No constitutional deviation. The feature adds no write path, no dependency, no endpoint and
no persisted file; it draws numbers that were already on the wire, and every derived state
it introduces carries its evidence.

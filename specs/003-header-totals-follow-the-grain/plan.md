# Implementation Plan: The header total counts what is on screen

**Branch**: `003-header-totals-follow-the-grain` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-header-totals-follow-the-grain/spec.md`

## Summary

`App.tsx` reduces the filtered feature list into `totals`. It gains a branch: at story
grain it reduces `storyRows` instead, which is the list the story board is drawn from and
is already filtered by project and search. Everything else — the bar, the percentage, the
badge — reads the same two numbers as before. Frontend only; no model change, no endpoint,
no request.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 19 (frontend); Python 3.13 for the one test

**Primary Dependencies**: unchanged

**Storage**: none

**Testing**: one pytest case pinning the identity the feature leans on — stories plus the
leftover bucket sum to the feature's task total. The header arithmetic itself is a two-line
reduce over a list that is already covered; a frontend test harness does not exist in this
repository and this change does not justify introducing one.

**Project Type**: web

## The interesting part is that it is almost a no-op

The sums agree on an unfiltered board, because 002 made stories plus the leftover bucket
add up to the feature's total. That is worth stating rather than discovering later:

- It means the change is only observable under an active search, which is the case worth
  getting right and the reason the request was made.
- It means the identity is load-bearing. If the header total ever moves when the grain is
  switched on an unfiltered board, the leftover bucket has stopped accounting for something
  — so SC-003 pins it with a backend test, at the place where it could actually break,
  rather than trusting a number in a corner of the UI to reveal it.

Alternative considered: sum the visible cards at feature grain too, by reducing over the
story rows in both cases. Rejected — at feature grain the cards *are* features, and summing
them through a story-shaped intermediate would make the code say something the screen does
not.

## Complexity Tracking

No constitutional deviation: no write path, no dependency, no persisted state, and the
number on screen keeps naming what it counted.

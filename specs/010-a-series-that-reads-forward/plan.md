---
description: "Implementation plan for ordering the history series by date"
---

# Implementation Plan: A series that reads forward

**Branch**: `010-a-series-that-reads-forward`

**Input**: [spec.md](./spec.md)

## Summary

Replace `points.reverse()` with a stable sort on the date each point already carries. The reverse
was a cheap stand-in for "oldest first" that happened to work while log order and author order
agreed; the sort states the intent directly and holds when they do not.

## Technical Context

**Language/Version**: Python 3.13

**Primary Dependencies**: none added.

**Storage**: none — the series is rebuilt per request and cached only in memory, keyed on HEAD.

**Testing**: pytest at the existing `--cov-fail-under=100` gate. The case needs a real repository
with real out-of-order author dates, so the existing `repo` fixture pattern is extended rather
than mocked — `git commit --date` sets the author date, which is exactly the knob a rebase turns.

**Target Platform**: unchanged.

**Project Type**: web application; backend only.

**Performance Goals**: a sort over at most a few hundred points, once per cache miss.

**Constraints**: dates are ISO 8601 strings from `%aI`, so they sort lexicographically only within
one offset. They must be compared as datetimes, not as strings, or a repository whose commits span
two timezones would order by offset rather than by instant.

**Scale/Scope**: one line of behaviour, one test, one fixture.

## Constitution Check

**PASS.**

- **I. Read-only** — `git log` and `cat-file` only, unchanged by this feature.
- **II. Files are the truth** — this is that principle applied to time: the date on the point is
  the evidence, so the date is what orders it. Ordering by log position was ordering by something
  the artefact does not say.
- **III. One malformed file may not blank the board** — unchanged; a repository that produces no
  countable point still reports why.
- **IV–VII** — untouched.

## Approach

`points.reverse()` becomes `points.sort(key=...)` over the parsed date. Python's sort is stable, so
FR-002 comes free: equal dates keep the order git gave them.

Parsing: `datetime.fromisoformat` handles the offsets `%aI` emits. A point whose date cannot be
parsed would be a scanner bug rather than a repository quirk — but sorting must not raise on one,
so the key falls back to the epoch and the point keeps its place at the front rather than taking
the process down.

## Verification

- The new test, plus the whole suite at 100%.
- The CI scan-this-repository step, which is what caught this, run against the rebased branch.
- The Trend view over the author's real root.

## Risks

**The fixture must genuinely reproduce the failure.** A test that builds commits in order and then
sorts them proves nothing. The fixture sets author dates deliberately out of order and asserts the
*unsorted* order would have been wrong, so it fails against today's code.

## Complexity Tracking

*No constitutional violations are claimed for this feature.*

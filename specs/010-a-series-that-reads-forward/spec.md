# Feature Specification: A series that reads forward

**Feature Branch**: `010-a-series-that-reads-forward`

**Created**: 2026-08-14

**Status**: Implemented

**Input**: CI failed on a rebased branch with `AssertionError: the series must read oldest to
newest` — an assertion this repository wrote about its own scanner, catching a defect nobody had
hit yet.

## Overview

`project_history` labels every point with the commit's **author** date and orders the series by
the order `git log` printed it:

```python
"--format=%x01%H%x1f%aI%x1f%s",   # author date
...
points.reverse()                  # oldest first: a chart reads left to right
```

That is only correct while author date and log order agree. They agree in a repository whose
commits were made in the order they were written, and stop agreeing the moment anything is
rebased, cherry-picked, or merged from an older branch — all of which are ordinary.

The failure that surfaced it: a feature branch was rebased onto `main` after the branch below it
was squash-merged. The rebase preserved the author date, so the branch's own commit — written at
16:06 — landed on top of a squash commit GitHub created at 16:09. Log order says the older commit
is newer. The chart would draw its last segment travelling backwards in time.

The x-axis is a date. The series must be ordered by that date and by nothing else.

### Why this is worth fixing rather than working around

The immediate symptom could be removed by rewriting the offending commit's date, and the defect
would sit in `main` waiting for the next rebase. The trend view is the only place SpecDash makes a
claim about *time* rather than about position, and a time series drawn in the wrong order is not a
smaller version of the truth — it is a different shape.

It is also the one bug in this codebase its own CI was already written to catch, which is worth
honouring rather than silencing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The trend reads left to right, whatever git did (Priority: P1)

Someone who rebases — which is everyone — opens the Trend view and sees a line that advances
through time.

**Why this priority**: it is the whole feature, and the repository's own CI is currently red
because of it.

**Independent Test**: build a repository whose author dates are deliberately out of order against
its commit order, ask for its history, and confirm the series comes back ascending by date.

**Acceptance Scenarios**:

1. **Given** a repository where a commit's author date precedes that of its parent, **When** the
   history is read, **Then** the points come back ordered oldest to newest by date.
2. **Given** a repository whose commits are already in order, **When** the history is read,
   **Then** the series is unchanged from today's output.
3. **Given** two commits sharing an author date to the second, **When** the history is read,
   **Then** both appear, and their relative order is stable between reads.
4. **Given** any series, **When** it is drawn, **Then** the last point is the most recent by date,
   so the figure the card reports is the latest state rather than whichever commit git printed
   first.

### Edge Cases

- A single-commit history: ordering is a no-op and must not raise.
- Commits whose author dates are identical: sorting must be stable, so equal dates keep the order
  git gave them rather than being shuffled between reads.
- A repository rebased so that *every* author date is out of order — the sort is total, not a
  local repair.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The history series MUST be ordered ascending by the date each point carries, and
  MUST NOT rely on the order `git log` printed its commits.
- **FR-002**: The sort MUST be stable, so points sharing a date keep a deterministic order between
  reads.
- **FR-003**: The last point of the series MUST be the most recent by date, since the card reports
  it as the current state.
- **FR-004**: Output for a repository whose dates already ascend MUST be unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The CI assertion `the series must read oldest to newest` passes on a branch whose
  author dates are out of order.
- **SC-002**: Backend line coverage remains at 100%.
- **SC-003**: The Trend view over the author's real root draws every project's line left to right.

## Assumptions

- Author date is the right label for a point: it is when the work was written, which is what a
  progress-over-time chart is about, and it survives a rebase where the commit date does not.

## Dependencies

- None. One module, one line of behaviour, one test.

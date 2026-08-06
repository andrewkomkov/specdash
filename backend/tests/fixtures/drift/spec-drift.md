# Feature Specification: Drift fixture

**Feature Branch**: `007-drift`
**Created**: 2026-08-01
**Status**: Clarified — ready for planning
**Input**: User description: "show me every project at once, and do not
touch my files while you do it"

## Overview

The interesting values in a real spec wrap across physical lines constantly, and a
reader that takes one line at a time truncates most of them.

### User Story 1 - See every project on one board (Priority: P1)

A person with several repositories open wants one page that shows all of them.

**Why this priority**: Without the board there is nothing to click into, so
everything else depends on it landing first.

**Independent Test**: Every feature folder appears exactly once, in the column
its files justify.

**Acceptance Scenarios**:

1. **Given** two projects under the root, **When** the page loads, **Then** both
   appear with their features laid out by stage.
2. **Given** a folder with no spec-kit layout, **When** the scan runs, **Then** it
   is ignored rather than shown empty.

### User Story 4 — Understand why a card sits where it does (Priority: P3)

**Acceptance Scenarios**:

1. **Given** a spec whose status contradicts its task list, **When** the card is
   placed, **Then** the task list wins and the card says so.

## Requirements

### Functional Requirements

- **FR-001**: The service MUST discover every spec-kit project under the configured
  root without being told about each one, because a project that has to be
  registered is a project that will be forgotten.
- **FR-002**: The service MUST NOT write anything into a scanned project.

### Key Entities

- **Project**: a directory holding `.specify/` or `specs/`.

## Success Criteria

- **SC-005**: A cold scan of twenty projects finishes in under two seconds.
- **SC-005a**: A rescan after a single save finishes in under four hundred
  milliseconds, measured from the write to the broadcast.
- **SC-006**: Nothing on the page is editable, [NEEDS CLARIFICATION: does an
  export button count as editing?] and no request leaves the machine.

## Edge Cases

- A `specs/` directory holding a file rather than a feature folder.
- Two projects with the same directory name under different parents.

## Clarifications

### Session 2026-08-02

- Q: Should the board write anything at all? → A: No. Read-only is structural.

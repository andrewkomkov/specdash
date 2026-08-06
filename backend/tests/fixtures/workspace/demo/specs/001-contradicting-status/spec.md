# Feature Specification: A spec that disagrees with its own task list

**Feature Branch**: `001-contradicting-status`
**Created**: 2026-07-01
**Status**: Clarified — ready for planning
**Input**: User description: "the prose is the oldest thing in the folder"

## Overview

The status line was written before the work started and never touched again. The
checkboxes were ticked as the code landed. They disagree, and the checkboxes win.

### User Story 1 - Ship it (Priority: P1)

**Acceptance Scenarios**:

1. **Given** every task is ticked, **When** the stage is derived, **Then** the
   feature is Done regardless of what the status line claims.

## Requirements

- **FR-001**: Stage placement MUST be derived from artefacts on disk.

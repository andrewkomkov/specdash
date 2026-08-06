# Feature Specification: Planned but not yet cut into tasks

**Feature Branch**: `002-planned-only`
**Created**: 2026-07-20
**Status**: Draft
**Input**: User description: "a feature that has a plan and nothing else"

## Overview

A feature whose pipeline stopped after planning. It belongs in the Plan column,
and its evidence should say why.

### User Story 1 - Plan it (Priority: P2)

**Acceptance Scenarios**:

1. **Given** a plan.md and no tasks.md, **When** the stage is derived, **Then**
   the feature sits in Plan.

## Requirements

- **FR-001**: A feature without `tasks.md` MUST NOT be shown as started.

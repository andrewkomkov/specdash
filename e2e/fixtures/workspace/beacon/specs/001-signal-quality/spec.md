# Feature Specification: Signal quality

**Feature Branch**: `001-signal-quality`
**Created**: 2026-01-08
**Status**: Shipped
**Input**: User description: "report how good the signal is"

## Overview

Every task is ticked, so this feature belongs in Done. Its stories finish unevenly, and
some of its tasks name no story at all.

### User Story 1 - Measure the signal (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a receiver, **When** it is sampled, **Then** a quality figure is produced.

### User Story 2 - Say when it is unreliable (Priority: P2)

**Acceptance Scenarios**:

1. **Given** a poor sample, **When** it is reported, **Then** it is marked unreliable.

## Requirements

- **FR-001**: A quality figure MUST accompany every sample.
- **FR-002**: An unreliable figure MUST be marked.

## Success Criteria

- **SC-001**: Sampling costs under a millisecond.

# Feature Specification: Map the catalogue

**Feature Branch**: `001-map-the-catalogue`
**Created**: 2026-01-05
**Status**: In progress
**Input**: User description: "draw the catalogue as a map"

## Overview

Half the work is done and half is not, so this feature belongs in Implement whichever way
the board is read.

### User Story 1 - Draw the map (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a catalogue, **When** it is drawn, **Then** every entry has a position.

### User Story 2 - Zoom without redrawing (Priority: P2)

**Acceptance Scenarios**:

1. **Given** a drawn map, **When** it is zoomed, **Then** nothing is re-fetched.

## Requirements

- **FR-001**: Every entry MUST have a position.
- **FR-002**: Zooming MUST NOT re-fetch.

## Success Criteria

- **SC-001**: A catalogue of ten thousand entries draws in under a second.

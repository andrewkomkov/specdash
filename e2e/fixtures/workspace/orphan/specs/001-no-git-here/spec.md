# Feature Specification: No git here

**Feature Branch**: `001-no-git-here`
**Created**: 2026-01-09
**Status**: In progress
**Input**: User description: "a project nobody put under version control"

## Overview

This project is not a git repository, so the trend view has to say so rather than draw an
empty chart. [NEEDS CLARIFICATION: should it offer to initialise one?]

### User Story 1 - Work without git (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a project not under git, **When** the trend is opened, **Then** it says history
   is unavailable.

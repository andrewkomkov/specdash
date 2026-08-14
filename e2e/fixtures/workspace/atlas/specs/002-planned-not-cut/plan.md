# Implementation Plan: Planned but not cut

## Summary

Planned, deliberately not cut into tasks.

## Technical Context

**Language/Version**: Python 3.13

## Constitution Check

- [x] I. Read-only holds
- [ ] V. Live — this plan adds a manual refresh step

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| A manual refresh button | the watcher cannot see this source | polling it would cost more than it saves |
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |

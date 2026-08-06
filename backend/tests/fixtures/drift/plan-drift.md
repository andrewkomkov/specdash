# Implementation Plan: Drift fixture

## Summary

One container serving a read-only board, with the parsers tolerant enough to
survive template drift between spec-kit versions.

## Technical Context

**Language/Version**: Python 3.13 (backend), TypeScript 5.8 (frontend)
**Primary Dependencies**: FastAPI, pydantic v2, watchfiles; React 19, Mantine 8,
Vite 7
**Storage**: Two new preferences in the existing DataStore-backed settings file,
plus an in-memory snapshot that is rebuilt on every scan and never persisted
**Testing**: pytest for the parsers, a scan of this repository in CI
**Target Platform**: [NEEDS CLARIFICATION: which architectures must the image cover?]
**Project Type**: web

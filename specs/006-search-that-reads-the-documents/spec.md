# Feature Specification: Search that reads the documents

**Feature Branch**: `006-search-that-reads-the-documents`

**Created**: 2026-08-07

**Status**: Implemented

**Input**: User description: "добавь поиск - мб какуюто duckdb или что - чтоб и типо по токенам и по схожести и вообще. Сначала хорошо исследуй вопрос - важно сохранить все фичи и реалтайм и все все и поиск прикрутить оч удобный и оставить 1 контейнер"

## Overview

The board has a search box. It filters cards by title, summary and task text, in the
browser, against the snapshot it already holds — and the snapshot holds no document text at
all. Artefacts arrive as metadata: a size, a word count, a heading count. So **the one thing
nobody can search today is the writing** — the specification, the plan, the research, the
contracts. The documents the whole tool exists to surface are the documents it cannot find
anything in.

This feature indexes them. Full text, ranked, with the matching line shown.

### What the research settled

Measured against the author's own corpus: 5 projects, 23 features, 103 documents, 869 KB of
text, 135k words.

**SQLite FTS5 is already in the shipping image's standard library** — verified inside
`python:3.13-slim`, `porter` and `trigram` tokenizers included. Indexing everything takes
76 ms, queries return in 0.02–1.4 ms with BM25 ranking and snippets, and the whole index
costs about a megabyte of memory. Zero new dependencies, zero image growth.

**DuckDB was measured and rejected.** A 15 MB wheel on a 284 MB image, and its full-text
search is an `INSTALL`/`LOAD` extension fetched over the network at runtime — which breaks
the guarantee that this thing loads nothing from the internet. Baking the extension in is
possible and is machinery, for a columnar analytics engine pointed at 0.9 MB of prose.

**Embeddings were measured and rejected, for now.** The smallest credible stack still needs
a model file plus a tokenizer and numpy, or 18 MB of onnxruntime. Either it downloads a
model at runtime, breaking the same guarantee, or it adds tens of megabytes to a small
image. At this corpus size semantic similarity adds little over BM25, and the moment it does
— a much larger corpus, or cross-language matching — is the moment to revisit.

**Similarity without a model.** Trigram indexing matches substrings (`calibrat` finds
`Calibration`) but not typos (`calibraton` finds nothing). `difflib`, in the standard
library, resolves typos in 0.3 ms — and beat `rapidfuzz` (1.4 ms) at this size, so a
1.1 MB dependency for a slower answer was not taken.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find the sentence, not just the card (Priority: P1)

Someone remembers a decision was written down — "we rejected polling because…" — and cannot
remember which project, which feature, or which document. Today there is nowhere to type
that.

**Why this priority**: It is the request, and it is the only thing in the tool with no
answer at all today.

**Independent Test**: Search for a phrase that appears only in the body of one `research.md`
and land on it.

**Acceptance Scenarios**:

1. **Given** a phrase written in a `plan.md`, **When** it is searched, **Then** the document
   is returned with the matching text shown in context.
2. **Given** a query matching several things, **When** results are shown, **Then** they are
   ordered by relevance, not by project order or alphabetically.
3. **Given** a result, **When** it is chosen, **Then** the feature opens at the thing that
   matched — the document, the task list, or the story.
4. **Given** a query with punctuation like `read-only`, **When** it is searched, **Then** it
   is treated as text and never as query syntax.

### User Story 2 - Search everything the board knows (Priority: P1)

Tasks, user stories, requirements, checklist items and features are all searchable content,
and each answers a different question.

**Independent Test**: One query returns hits of several kinds, each labelled.

**Acceptance Scenarios**:

1. **Given** a term appearing in a task and in a requirement, **When** it is searched,
   **Then** both are returned and each says which it is.
2. **Given** results, **When** they are filtered to one kind, **Then** only that kind
   remains.
3. **Given** a hit, **When** it is displayed, **Then** it names its project and feature, so
   a title alone never has to carry the context.

### User Story 3 - Be forgiving (Priority: P2)

**Independent Test**: A misspelt query still leads somewhere.

**Acceptance Scenarios**:

1. **Given** a partial word like `calibrat`, **When** it is searched, **Then** longer words
   containing it are found.
2. **Given** a misspelling like `calibraton`, **When** nothing matches, **Then** the closest
   real titles are offered rather than an empty page.
3. **Given** a query in Russian, **When** it is searched, **Then** it works the same way.

### User Story 4 - Stay live and stay one container (Priority: P1)

**Why this priority**: The constraints the request set, and the ones easiest to break by
accident.

**Independent Test**: Change a file, search for the new text, find it — without a restart.

**Acceptance Scenarios**:

1. **Given** a rescan, **When** it completes, **Then** the index reflects the new files.
2. **Given** the running service, **When** the index is built, **Then** nothing is written
   to disk anywhere — the index lives in memory and dies with the process.
3. **Given** the image, **When** it is built, **Then** it has gained no dependency and no
   meaningful size.
4. **Given** a scan of the author's corpus, **When** the index is rebuilt with it, **Then**
   the added time is a fraction of the scan, not a multiple of it.

## Requirements *(mandatory)*

- **FR-001**: Full document text MUST be searchable — spec, plan, research, data model,
  quickstart, contracts and checklists.
- **FR-002**: Tasks, user stories, requirements, success criteria, checklist items and
  features MUST be searchable, each hit labelled with its kind.
- **FR-003**: Results MUST be ranked by relevance and MUST carry an excerpt showing the
  match in context.
- **FR-004**: User input MUST be escaped, never interpolated into query syntax. `read-only`
  is text.
- **FR-005**: Partial words MUST match by prefix, and substrings anywhere MUST be findable.
- **FR-006**: When nothing matches, the closest real titles MUST be offered.
- **FR-007**: The index MUST be rebuilt with every rescan and MUST live only in memory —
  SpecDash writes nothing, and that includes its own index (Constitution I).
- **FR-008**: No new runtime dependency, and no second container.
- **FR-009**: Every existing behaviour MUST survive — the board, both grains, the trend
  view, the live socket, the language switch, and the existing header filter.
- **FR-010**: Searching MUST be reachable from the keyboard alone.

## Success Criteria *(mandatory)*

- **SC-001**: A phrase written only inside a `research.md` is findable in one query.
- **SC-002**: A rescan of the author's corpus, index included, stays under 300 ms.
- **SC-003**: A query returns in under 50 ms at the API.
- **SC-004**: The image gains no dependency and no more than a megabyte.
- **SC-005**: Backend coverage stays at 100%, and the end-to-end suite still passes.

## Edge Cases

- An empty or whitespace query: returns nothing rather than everything.
- A query of only punctuation: returns nothing rather than raising.
- A document too large to index sensibly: the 2 MB ceiling that already guards serving
  applies to indexing too.
- A file that cannot be read at index time: skipped, exactly as the scanner skips it.
- A search issued while a rescan is in flight: answered from whichever index is current,
  never from a half-built one.

# Implementation Plan: Search that reads the documents

**Branch**: `006-search-that-reads-the-documents` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

## Summary

`backend/app/search.py` builds an in-memory SQLite FTS5 index from the snapshot the scanner
already produced, plus the document bodies it did not keep. The index is rebuilt inside the
same background thread as the scan and swapped in atomically. One new endpoint serves ranked
hits with snippets. The frontend gains a command palette over ⌘K, leaving the existing header
filter exactly as it is.

## Technical Context

**Language/Version**: Python 3.13, TypeScript 5.8 / React 19

**Primary Dependencies**: **none added.** `sqlite3` is in the standard library and the
image's build has FTS5 with the `porter` and `trigram` tokenizers — verified inside
`python:3.13-slim` rather than assumed.

**Storage**: `sqlite3.connect(":memory:")`. Nothing on disk, which is not a convenience: an
index file would be the first thing SpecDash ever wrote, and the first principle says it
writes nothing.

**Testing**: pytest to 100% as before, plus end-to-end cases for the palette.

**Performance Goals**: index build a fraction of the scan (measured: 76 ms against 127 ms),
queries under 50 ms at the API (measured: 0.02–1.4 ms in the engine).

## Two indexes, because one tokenizer cannot do both jobs

- **`porter unicode61`** — the main index. Stems, so `calibrating` finds `calibration`;
  ranks with BM25; produces snippets. Prefix queries (`"calibrat"*`) work.
- **`trigram`** — the fallback, over **titles and subtitles only**. Matches a substring
  anywhere in a word, which the token index cannot: `ocket` finds `websocket`. It is
  consulted only when the main index returns nothing, because its hits are noisier and it
  cannot rank as usefully.

  Excluding document bodies from it was a measurement, not a guess: trigram-indexing 980 KB
  of prose costs **86 ms of a 105 ms build**, and restricting it to titles brings the whole
  index down to 34 ms while still finding `ocket` and `alibrat` where they matter. Prose is
  what the token index is for; a half-remembered substring is nearly always part of a name.

A third layer, `difflib` from the standard library, answers "did you mean" when both come
back empty. Measured at 0.3 ms over this corpus, and faster than the 1.1 MB alternative.

## Escaping, which is a correctness requirement rather than a nicety

`read-only` is not a search for "read" minus "only" — but FTS5 reads `-` as syntax and
raises. This was found by running it, not by reading the manual. Every user term is wrapped
in double quotes and suffixed with `*`, which makes punctuation inert and gives prefix
matching in one step. `"read-onl"*` and `"реальн"*` were both verified against the engine.

Quoted sections of the user's query are preserved as phrases; everything else is ANDed.

## Building it where the scan already is

`Hub.rescan` runs the scan in a worker thread with `asyncio.to_thread`. The index is built in
that same call, so the event loop never sees the work and a search issued mid-rescan is
answered by the previous index — complete and consistent — until the new one replaces it in a
single assignment.

Reading document bodies for the index looked like the one extra cost, and the first draft of
this plan had the scanner hand its already-read text to the indexer. Measuring killed it:
reading all 106 files costs **4.6 ms of a 119 ms build**. The other 115 ms is FTS5 doing the
indexing, which no amount of sharing avoids. A seam threaded through three functions to save
four milliseconds is a worse plan than reading the files again, so the index reads them.

## The palette, and why the header filter stays

They are different tools and merging them would spoil both.

- The **header filter** narrows the board. It is instant, local, and answers "show me less".
- The **palette** (⌘K) answers "where is this written". It queries the server, ranks, shows
  an excerpt, and opens the thing.

The palette is built from Mantine's `Modal` rather than `@mantine/spotlight`, because a
dependency is a dependency and this is a list with a text input above it.

## Complexity Tracking

No constitutional deviation. Nothing new is written, nothing new is fetched, and no
dependency is added — the search engine was already inside the image, in the standard
library, unused.

# Implementation Plan: Ready for a stranger

**Branch**: `005-ready-for-a-stranger` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-ready-for-a-stranger/spec.md`

## Summary

One dictionary module and a context provider replace every hardcoded label in the frontend.
`FeatureCard` gains what `StoryCard` already had. The repository gains its furniture, a
README built around screenshots of the real board, and a landing page published from the
same repository by the same CI. Nothing in the backend changes.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 19; no backend change

**Primary Dependencies**: **none added.** The constitution says the page requests nothing
from the internet and everything is inside the image; an i18n library would be a runtime
dependency for a job that is a dictionary lookup and two plural rules.

**Storage**: the chosen language is a browser preference beside the existing ones.

**Testing**: E2E for both languages, the switch, the persistence and the keyboard path — all
behaviours no unit test can see. Backend coverage stays at 100% because the backend is
untouched.

**Target Platform**: unchanged, plus GitHub Pages for the landing page.

## Localisation without a library

`frontend/src/i18n.ts` holds a flat dictionary keyed by dotted ids, one object per language,
and a `plural` helper. English is the fallback and the source of truth: a key missing from
Russian renders the English string rather than the key, so a gap looks like an untranslated
label and never like a broken page.

Interpolation is `{name}` substitution, deliberately primitive. Plurals are a function per
language — English needs one boundary, Russian needs the usual three forms — because
`1 историй` is on screen today and is exactly what a naive `${n} ${noun}` produces.

The line the dictionary must not cross: **anything read from a user's files stays as it is
written.** Feature titles, task descriptions, summaries, and the evidence strings the
scanner produces (`all 38 tasks ticked`) are the user's content and the scanner's output,
not interface copy. They are English because the backend writes them in English, and
translating them would mean translating the user's own documents.

`relativeTime` moves into the dictionary, because "2 дн назад" is interface copy that
happens to live in a utility.

## Keyboard

`FeatureCard` gets `role="button"`, `tabIndex={0}`, an Enter/Space handler and an
`aria-label` naming the feature — the same four things `StoryCard` already carries. A
`:focus-visible` outline goes in the shared card stylesheet, so both card types get it and
neither can drift.

## The landing page

`site/index.html`, one self-contained file: inline CSS, no font host, no analytics, the
screenshots referenced from the same directory. Published by a workflow using
`actions/deploy-pages` on every push to main, so it cannot drift from the repository.

It is a separate file from the README rather than a generated version of it. They are read
by different people in different moods, and a generator that turned one into the other would
serve neither well.

## Screenshots

Taken from a real board, with the author's permission, against their own projects — all of
which are public. They are taken **after** localisation, in English, because a screenshot of
a Russian board in an English README is the exact problem this feature exists to fix. Stored
in `.github/assets/` and committed, not hotlinked.

They will age. That is accepted rather than solved: an automated screenshot pipeline is more
machinery than a five-screenshot README is worth.

## Linting

`ruff` for Python and `eslint` for TypeScript, both in CI. Style stops being a review topic,
and the rules live in the repository rather than in a reviewer's head.

## Complexity Tracking

No constitutional deviation. No runtime dependency is added, nothing is written into a
scanned project, and the landing page holds itself to the same no-third-party rule as the
application.

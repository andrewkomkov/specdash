---
description: "Implementation plan for reading the rest of spec-kit"
---

# Implementation Plan: The board reads the rest of spec-kit

**Branch**: `008-the-rest-of-spec-kit`

**Input**: [spec.md](./spec.md)

## Summary

Five reads and one derivation. The reads are small parsers over files the scanner already walks
past; the derivation is a pure function over data `scan_feature` has already assembled by the time
it returns. Nothing new is opened during the hot loop except three small JSON files per *project*
and one YAML file per declared workflow — both per-project, not per-feature, so the cost does not
scale with the thing that dominates a scan.

The one architectural decision worth stating: **findings are computed, never stored**. They are a
function of a `Feature` and are recomputed on every scan, which means there is no cache to
invalidate, no file written anywhere, and no way for a finding to outlive the disagreement it
describes.

## Technical Context

**Language/Version**: Python 3.13 backend, TypeScript 6 / React 19 frontend

**Primary Dependencies**: one addition — `PyYAML` for `workflow.yml`. Nothing else. The frontend
adds no dependency; the new drawer tab uses Mantine components already in the bundle.

**Storage**: none. Findings, toolchain state and workflows all live in the snapshot, which is
rebuilt on every scan and never persisted.

**Testing**: pytest with the existing `--cov-fail-under=100` gate, so every branch added here
arrives with a test. Playwright covers the two user-visible surfaces — the card badge and the
drawer tab — because a badge that renders nothing looks identical to a feature with no findings.

**Target Platform**: the existing single container; no new port, no new mount, no outbound call.

**Project Type**: web application, FastAPI backend serving a built React frontend.

**Performance Goals**: SC-005 caps the scan-time increase at 25%. The consistency pass is O(tasks
× requirements) per feature in the worst case; it is implemented as a single lowercased join per
feature and a substring test per requirement, which is linear in practice. Manifest hashing is
bounded by FR-017 and is per project.

**Constraints**: Principle I forbids any write into a scanned project, which rules out caching
digests beside the files they describe. FR-016 additionally forbids *reading* outside the project
directory, which is a containment rule the codebase does not have yet and which this feature must
introduce rather than assume.

**Scale/Scope**: one new backend module, four extended ones, one new drawer tab, one card badge,
two new project surfaces.

## Constitution Check

**PASS.** Checked against each principle rather than in the aggregate:

- **I. Read-only** — every new operation is `open(..., 'rb')`, `stat`, `iterdir` or `hashlib`.
  Manifest verification reads bytes and compares; it never repairs a digest, never writes a
  cache, and never touches the manifest. FR-016 tightens the principle rather than testing it:
  a path in a manifest is data from the scanned project, and following it out of the tree would
  be the first time SpecDash let a scanned file decide what to open.
- **II. Files are the truth** — this feature is that principle made visible. FR-005 is explicit
  that a status/artefact disagreement is *reported* and never allowed to change placement, because
  Principle II already decided which side wins. FR-011 refuses to read placeholder text as a pass:
  inventing a verdict would be the prose winning over the artefact by the back door.
- **III. One malformed file may not blank the board** — FR-020 requires an unparseable workflow to
  be skipped with a reason; a manifest that cannot be read leaves the project otherwise intact.
  The inverse holds too: `unknown` and `unverified` exist precisely so nothing has to be guessed.
- **IV. A project is a directory** — no registry, no config. The new files are read if present and
  absent otherwise (FR-014, SC-007).
- **V. Live** — findings are derived inside the existing scan, so they arrive on the existing
  watch path with no second mechanism.
- **VI. One container, no internet** — PyYAML is vendored into the image at build time like every
  other dependency. Nothing is fetched at runtime.
- **VII. Portfolio question first** — FR-025 puts toolchain and workflows on the *project*, not
  behind a feature, and FR-023 keeps the card to a count and a severity so the badge stays
  comparable across projects. FR-028 forbids a seventh column, which would have made two boards
  incomparable for the sake of one feature.

No principle required an exception, so `Complexity Tracking` below is empty by fact rather than
by omission.

## Approach

### Step 1 — `checks.py`, a pure module

A new `backend/app/checks.py` exporting `findings_for(feature) -> list[Finding]`. It imports
models and nothing else — no filesystem, no git — so it is testable by constructing a `Feature`
and is impossible to make write anything.

Each rule is a small function returning zero or more findings. The rule set is FR-003 through
FR-009. Ordering is by severity then code, so a card's "worst" is stable between scans.

Called at the end of `scan_feature`, after stories and stage are resolved, because three rules
depend on the resolved stage.

### Step 2 — `plan.md` gains two sections

`parse_plan` currently returns `(summary, tech)`. It becomes `(summary, tech, constitution)` where
the third is `ConstitutionResult | None`.

The verdict is drawn from explicit evidence in this order: an unticked gate checkbox or the word
`FAIL`/`VIOLATION` outside a heading → `fail`; `PASS` or an all-ticked gate list → `pass`;
anything else, including untouched template text, → `unknown`. The matched line is retained so the
drawer can show what the verdict rests on, per Principle II's "every derived state carries its
evidence".

`Complexity Tracking` is a GFM table; the placeholder row is recognised by its bracketed
`[violation]`-style cells and dropped.

### Step 3 — project provenance

`scan_project` reads the three JSON files. Manifest verification lives in a helper that:

1. resolves each listed path against the project root and rejects anything escaping it (FR-016),
2. stats it — missing → `missing`, larger than 4 MiB → `unverified` (FR-017),
3. hashes it in 64 KiB chunks and compares → `ok` or `modified`.

4 MiB is far above any file spec-kit installs, so the bound only ever fires on something that is
not what the manifest thinks it is.

### Step 4 — workflows

`.specify/workflows/workflow-registry.json` gives names and versions; each
`.specify/workflows/*/workflow.yml` gives the steps. Parsed with `yaml.safe_load` — `safe_load`
specifically, because the file comes from a scanned project and `load` would let it construct
Python objects. A step with `type: gate` is a gate; anything with a `command` is a command step;
anything else is skipped. Registry entries without a file are still listed, with no steps.

### Step 5 — the three dropped spec sections

`Key Entities` bullets are `**Name**: description` and split on the first colon outside the bold
run. `Assumptions` and `Dependencies` are plain bullet lists and reuse `Section.bullets()`.

### Step 6 — the surfaces

- **Card**: one badge, count and severity colour, rendered only when non-zero (FR-023).
- **Drawer**: a `Checks` tab holding findings, the constitution result and the complexity table.
- **Project**: toolchain and workflows in the project chip's tooltip and in the drawer's project
  context, reachable without opening a feature (FR-025).
- **i18n**: both languages, in the same commit as the strings (FR-027).

## Verification

- `pytest` with the 100% gate, run from `backend/`.
- `ruff check` and the frontend `tsc -b && vite build`.
- Playwright for the badge and the tab.
- The Development Workflow clause: run the built image against the author's whole mounted root,
  not only against this repository, and read the findings produced on real drifted input. A rule
  that fires on a real project it should not have fired on is a defect in this feature, not in
  that project.

## Risks

**A finding that is wrong is worse than no finding.** The board's credibility rests on Principle
II; a false positive spends it. Every rule is therefore stated as an observation about two named
artefacts, and the two rules most likely to misfire — unreferenced requirements and story
mismatches — are `warn`, not `blocker`, and are checked against the author's real root before
this ships.

**The constitution verdict is prose parsing.** It is the one place where a wrong answer is
plausible and confident. Mitigated by FR-011: the fallback is `unknown`, and `unknown` is
displayed as unknown rather than hidden.

**Manifest hashing on a cold mount.** Ten small files per project, hashed once per scan, on a
bind mount that may be slow. If SC-005 is missed, hashing moves behind the same on-demand
treatment `feature_commits` already gets — noted here so the fallback is a decision already made
rather than one taken under pressure.

## Complexity Tracking

*No constitutional violations are claimed for this feature.*

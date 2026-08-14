# Feature Specification: The board reads the rest of spec-kit

**Feature Branch**: `008-the-rest-of-spec-kit`

**Created**: 2026-08-14

**Status**: Implemented

**Input**: User description: "еще какие-то фичи spec kit у нас тут непокрыты?" — an audit of what
spec-kit 0.14.2 puts on disk against what the scanner actually opens.

## Overview

SpecDash reads six files per feature and two facts per project. spec-kit 0.14.2 writes
considerably more than that, and the parts left unread are not decoration — they are the parts
that say whether the work is *sound*, not merely how far along it is.

The audit found four categories of gap.

| Gap | On disk | Read today |
|-----|---------|-----------|
| Constitution compliance | `plan.md` → `## Constitution Check`, `## Complexity Tracking` | no |
| Toolchain provenance | `.specify/integration.json`, `init-options.json`, `integrations/*.manifest.json` | no |
| Declared process | `.specify/workflows/workflow-registry.json`, `workflows/*/workflow.yml` | no |
| Spec sections | `spec.md` → `Key Entities`, `Assumptions`, `Dependencies` | no |

And one thing that is on disk in pieces rather than as a document: the **consistency** between
the artefacts. spec-kit ships `/speckit.analyze` for exactly this, but it is a chat command whose
output lands in a transcript and is gone. SpecDash already holds every input it needs — parsed
requirements with ids, tasks with ids and story tags, checklists, statuses — so it can answer the
same question continuously and without being asked.

### Why the constitution gap is the important one

The constitution is the only document in spec-kit that binds. SpecDash already reads it, stores
it, serves it at `/api/projects/{id}/constitution` and shows its version on a chip. What it never
shows is whether any *feature* passes it — even though `plan-template.md` puts a `## Constitution
Check` gate in every plan, and a `## Complexity Tracking` table where a plan must declare, in
writing, each principle it is knowingly breaking and why.

A board that displays the rulebook but not the violations has the reference and not the finding.

### What this is not

This does not add a checker with opinions of its own. Every finding is a statement about two
artefacts disagreeing, and it names both. SpecDash does not decide whether `FR-012` is a good
requirement; it observes that no task mentions it. Principle III's line between tolerant and
inventive applies to findings as much as to parsing: a finding must be derivable, not guessed.

It also does not change the six columns. A finding is a property *of* a card, not a new place
for a card to sit.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what the artefacts disagree about (Priority: P1)

Someone running spec-kit across several repositories has features that look finished on the board
and are not: a requirement nobody cut into work, a clarification marker still open in a feature
that is already being implemented, a spec whose status says `Draft` over a fully ticked task list.

**Why this priority**: this is the whole reason the audit was worth acting on. Placement already
works; correctness does not exist yet. It is also the only item that needs no new file format —
it reads data the scanner already produces.

**Independent Test**: point SpecDash at a project with a known inconsistency (a requirement no
task references) and confirm the card carries a finding naming that requirement, that the drawer
lists it with both sides of the disagreement, and that a clean feature carries none.

**Acceptance Scenarios**:

1. **Given** a feature whose `tasks.md` cites some requirement ids but never `FR-012`, **When**
   the board is drawn, **Then** the feature carries one finding naming `FR-012` among the
   untraced requirements, and the finding names `spec.md` as its source.
1a. **Given** a feature whose `tasks.md` cites no requirement id at all, **When** the board is
   drawn, **Then** no requirement is reported, because the feature never adopted the convention
   that would make an omission from it meaningful.
2. **Given** a feature at stage `implement` whose `spec.md` still contains a
   `[NEEDS CLARIFICATION]` marker, **When** the board is drawn, **Then** the feature carries a
   blocker-severity finding, because work is proceeding over an open question.
3. **Given** a feature whose `tasks.md` is fully ticked and whose `**Status**` line still reads
   `Draft`, **When** the board is drawn, **Then** the feature carries an informational finding
   recording the disagreement — the stage is *not* changed, because Principle II already resolved
   it in the artefact's favour and the card already says so.
4. **Given** a feature with no inconsistencies, **When** the board is drawn, **Then** it carries
   no findings and no badge, and nothing is invented to fill the space.
5. **Given** a `tasks.md` referencing `US7` that `spec.md` does not define, **When** the board is
   drawn, **Then** the feature carries a finding, and the story still appears on the story board
   as it does today — the finding reports the gap, it does not withdraw the card.

### User Story 2 - Know whether a feature passes its own constitution (Priority: P1)

The plan for every feature contains a constitution gate and a table of declared violations.
Neither reaches the screen.

**Why this priority**: it is the single highest-value unread section on disk, and it is cheap —
one parser over one heading pair.

**Independent Test**: open a feature whose `plan.md` records a failing constitution check and
confirm the drawer states the verdict and lists the complexity rows; open one that passes and
confirm it states that too.

**Acceptance Scenarios**:

1. **Given** a `plan.md` with a `## Constitution Check` section whose prose resolves to a pass,
   **When** the feature is opened, **Then** the drawer states the check passed and shows the text
   it drew that from.
2. **Given** a `## Complexity Tracking` table with rows for violation, why needed and simpler
   alternative rejected, **When** the feature is opened, **Then** each row is shown as a declared,
   deliberate exception rather than as an error.
3. **Given** a `plan.md` whose constitution section is still template placeholder text, **When**
   the feature is opened, **Then** the verdict is reported as unknown rather than as a pass.
4. **Given** a `plan.md` with no constitution section at all, **When** the feature is opened,
   **Then** nothing is shown for it — an absence is data, not a failure.

### User Story 3 - Know what spec-kit each project is running (Priority: P2)

Across a mounted root, projects drift: one was initialised on 0.11 and never updated, another has
hand-edited skill files, a third uses a different integration.

**Why this priority**: it is the cross-project question the portfolio board exists to answer
(Principle VII), and the data is sitting in three small JSON files. It is P2 only because a stale
toolchain is rarely urgent.

**Independent Test**: point SpecDash at two projects initialised on different spec-kit versions
and confirm both versions are visible without opening either project.

**Acceptance Scenarios**:

1. **Given** a project with `.specify/integration.json`, **When** the board is drawn, **Then** its
   spec-kit version and installed integration are available on the project without opening a
   feature.
2. **Given** an integration manifest listing files with SHA-256 digests, **When** a listed file's
   contents no longer match its digest, **Then** the project reports that file as modified.
3. **Given** a listed file that no longer exists, **When** the board is drawn, **Then** the project
   reports it as missing, distinctly from modified.
4. **Given** a project whose `.specify/` holds none of these files, **When** the board is drawn,
   **Then** the project appears exactly as it does today, with no toolchain information and no
   error.

### User Story 4 - See the process a project has declared for itself (Priority: P2)

`.specify/workflows/` records the pipeline a project has committed to, including its review gates
and what happens on rejection. SpecDash draws a pipeline and knows nothing about the declared one.

**Why this priority**: it is genuinely useful for reading someone else's project, but unlike
stories 1 and 2 nothing is currently *wrong* without it.

**Independent Test**: open a project holding a bundled `speckit` workflow and confirm its steps
and gates are listed in the order the file declares them.

**Acceptance Scenarios**:

1. **Given** `.specify/workflows/workflow-registry.json` listing one workflow, **When** the project
   is inspected, **Then** the workflow's name, version and description are shown.
2. **Given** a `workflow.yml` with command steps and gate steps, **When** the workflow is
   inspected, **Then** the steps appear in file order, and a gate is visually distinct from a
   command and states its rejection behaviour.
3. **Given** a `workflow.yml` that cannot be parsed, **When** the project is scanned, **Then** the
   workflow is skipped with a reason recorded, and the rest of the project is unaffected.

### User Story 5 - Read the spec sections that are currently dropped (Priority: P3)

`Key Entities`, `Assumptions` and `Dependencies` are written by the template and discarded by the
parser.

**Why this priority**: real content, no risk, small parser — but it is additive detail rather than
a question the board is failing to answer.

**Independent Test**: open a feature whose spec declares key entities and confirm they appear in
the drawer with their descriptions.

**Acceptance Scenarios**:

1. **Given** a `spec.md` with a `### Key Entities` section, **When** the feature is opened,
   **Then** each entity appears with its name and description.
2. **Given** a `spec.md` with `## Assumptions`, **When** the feature is opened, **Then** the
   assumptions are listed.
3. **Given** a spec with none of these sections, **When** the feature is opened, **Then** the
   corresponding areas are absent rather than empty.

### Edge Cases

- A `plan.md` with two `## Constitution Check` headings — the first is used, the rest ignored,
  consistent with how requirements already keep their first occurrence.
- A `Complexity Tracking` table that is present but holds only the template's italic placeholder
  row: it produces no violations.
- An integration manifest whose digests are for a path outside the project directory: the file is
  read only if it resolves inside the project, and reported as unreadable otherwise. Principle I
  is about writing, but a scanner that follows a manifest out of the tree is still wrong.
- A very large scanned file referenced by a manifest: hashing is bounded, and a file over the
  bound is reported as unverified rather than read whole.
- A feature with a hundred unreferenced requirements: the card shows a count, not a hundred rows.
- `workflow.yml` containing YAML that is valid but not a workflow (no `steps`): skipped as
  unparseable, not rendered as a workflow with zero steps.
- Two workflows with the same id in the registry and on disk: the on-disk file wins, because the
  registry is a cache of what was installed and the file is what would run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scanner MUST derive a set of findings for each feature from artefacts it has
  already parsed, without opening any file it does not open today except those named in FR-010,
  FR-014 and FR-018.
- **FR-002**: Each finding MUST carry a stable machine code, a severity of `blocker`, `warn` or
  `info`, a human-readable message, and — where one exists — the reference and file it concerns.
- **FR-003**: The system MUST report a requirement declared in `spec.md` that no task in
  `tasks.md` references, at `warn` severity, only when `tasks.md` exists, and only when at least
  one other requirement of the same feature *is* referenced. A feature that cites no requirement
  id at all is following a different house style, and reporting that is a judgement about the
  document rather than an observation about two artefacts disagreeing. Untraced requirements MUST
  be reported as a single finding naming them, not one finding each: a card carries a count, and a
  count that rises with the number of requirements buries a blocker behind warnings.
- **FR-003a**: A `[NEEDS CLARIFICATION]` marker inside a fenced block or an inline code span MUST
  NOT count as an open question, in findings or in stage placement. Code formatting is what
  separates a document discussing the marker from one carrying it.
- **FR-003b**: A task's description MUST include its wrapped continuation lines. Reading only the
  first physical line truncated tasks mid-sentence — visible in the drawer, missing from search,
  and half-read by FR-003 — and every other folder in the parser already folds its own.
- **FR-004**: The system MUST report an unresolved `[NEEDS CLARIFICATION]` marker at `blocker`
  severity when the feature's stage is `plan`, `tasks`, `implement` or `done`, and at `info`
  severity otherwise.
- **FR-005**: The system MUST report a `**Status**` line that disagrees with the ticked state of
  `tasks.md`, at `info` severity, and MUST NOT alter the feature's stage because of it.
- **FR-006**: The system MUST report a story referenced by a task but absent from `spec.md`, at
  `warn` severity, and MUST continue to surface that story on the story board.
- **FR-007**: The system MUST report a duplicated requirement id at `warn` severity.
- **FR-008**: The system MUST report unticked checklist items in a feature at stage `done`, at
  `warn` severity.
- **FR-009**: The system MUST report a feature whose `plan.md` records a failed constitution check,
  at `blocker` severity.
- **FR-010**: The parser MUST read `## Constitution Check` from `plan.md` and resolve it to a
  verdict of `pass`, `fail` or `unknown`, retaining the text the verdict was drawn from.
- **FR-011**: A constitution section consisting of unmodified template placeholder text MUST
  resolve to `unknown`, never to `pass`.
- **FR-012**: The parser MUST read `## Complexity Tracking` into rows of violation, justification
  and rejected alternative, ignoring the template's placeholder row.
- **FR-013**: A feature whose `plan.md` has no constitution section MUST carry no constitution
  result, distinguishable from a section that resolved to `unknown`.
- **FR-014**: The scanner MUST read `.specify/integration.json`, `.specify/init-options.json` and
  `.specify/integrations/*.manifest.json` when present, and expose the spec-kit version, installed
  integrations, active integration, script flavour and feature numbering.
- **FR-015**: The scanner MUST verify each file listed in an integration manifest against its
  recorded SHA-256 digest and report each as `ok`, `modified`, `missing` or `unverified`.
- **FR-016**: Manifest verification MUST resolve every listed path inside the project directory and
  MUST refuse to read a path that escapes it.
- **FR-017**: Manifest verification MUST NOT read a file larger than a fixed bound, reporting it as
  `unverified` instead.
- **FR-018**: The scanner MUST read `.specify/workflows/workflow-registry.json` and each
  `.specify/workflows/*/workflow.yml`, exposing per workflow its id, name, version, description and
  ordered steps.
- **FR-019**: Each workflow step MUST be classified as a command step or a gate step, and a gate
  step MUST carry its message and its rejection behaviour.
- **FR-020**: A workflow file that is unreadable, invalid, or valid YAML without steps MUST be
  skipped with a recorded reason, and MUST NOT prevent the project from scanning.
- **FR-021**: Where a workflow appears both in the registry and as a file on disk, the file MUST
  take precedence.
- **FR-022**: The parser MUST read `Key Entities` from `spec.md` into name and description pairs,
  and `Assumptions` and `Dependencies` into lists.
- **FR-023**: A feature card MUST indicate that findings exist and how many, with the highest
  severity present distinguishable at a glance, and MUST show nothing when there are none.
- **FR-024**: The drawer MUST list a feature's findings, its constitution result and its declared
  complexity, each stating the evidence it rests on.
- **FR-025**: Toolchain information and declared workflows MUST be reachable without opening a
  feature, because they are properties of a project.
- **FR-026**: Every new surface MUST be read-only, carrying no control that appears to edit a
  scanned project.
- **FR-027**: All new user-facing strings MUST exist in both shipped languages.
- **FR-028**: The board MUST NOT gain a column, and no finding may move a feature between columns.

### Key Entities

- **Finding**: one observed disagreement between two artefacts, carrying its code, severity,
  message, reference and file. Findings belong to a feature and are recomputed on every scan.
- **Constitution result**: the verdict parsed from `plan.md`'s constitution gate, the text it was
  drawn from, and the declared complexity rows that accompany it.
- **Toolchain**: what spec-kit itself installed into a project — version, integrations, script
  flavour, numbering — together with the verification state of each file it claims to own.
- **Declared workflow**: a pipeline a project has committed to in `.specify/workflows/`, as an
  ordered list of command and gate steps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Running SpecDash over the author's own mounted root produces findings on at least
  one real feature and zero findings on at least one real feature, with no false positive
  surviving inspection.
- **SC-002**: A person looking at the board can tell which features have open problems without
  opening any of them.
- **SC-003**: For every feature in this repository whose `plan.md` has a constitution section, the
  parsed verdict matches what a reader of that section would say.
- **SC-004**: The spec-kit version of every scanned project is visible without opening a project.
- **SC-005**: Scan time over the author's root grows by no more than 25% against the current
  figure reported in the header.
- **SC-006**: Backend line coverage remains at 100%, as the existing gate requires.
- **SC-007**: A project holding none of the newly read files renders byte-identically to today.

## Assumptions

- Manifest digests are SHA-256 over raw file bytes, as written by spec-kit 0.14.2.
- `workflow.yml` is YAML 1.1 as emitted by spec-kit; parsing it warrants a real YAML parser rather
  than a hand-rolled reader, on Principle III grounds — a hand-rolled reader would have to guess.
- Constitution gate prose varies between projects, so the verdict is drawn from explicit markers
  (`PASS`, `FAIL`, ticked gates) and falls back to `unknown` rather than to optimism.
- Findings are recomputed per scan and never persisted, so there is no state to migrate and no
  file written anywhere.

## Dependencies

- A YAML parser is added to the backend runtime requirements. Nothing else is added.
- No change to the six-stage model, the watch mechanism, or the search index schema.

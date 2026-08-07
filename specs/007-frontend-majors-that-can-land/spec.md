# Feature Specification: The frontend majors that can actually land

**Feature Branch**: `007-frontend-majors-that-can-land`

**Created**: 2026-08-07

**Status**: Implemented

**Input**: User description: "разберись с красными" — dependabot's first run opened 15 pull
requests; eleven went green and four went red. All four red ones are frontend majors.

## Overview

The four red pull requests looked like four breaking changes. They are not. Measured one at
a time against the real toolchain, they are **three different failures wearing the same red
tick**, and only one of them is about this codebase at all.

| PR | Bump | Where it actually failed | Cause |
|----|------|--------------------------|-------|
| #27 | vite 7 → 8 | `npm ci` | peer conflict with the react plugin |
| #25 | @vitejs/plugin-react 4 → 6 | `npm ci` | peer conflict with vite |
| #26 | typescript 5.8 → 7.0 | `npm ci` | typescript-eslint does not support TS 7 |
| #21 | @mantine/core+hooks 8 → 9 | one e2e assertion | the assertion tested the wrong thing |

### What the investigation settled

**#27 and #25 are one change, not two.** `@vitejs/plugin-react@4` declares
`peer vite@"^4 || ^5 || ^6 || ^7"`; `@vitejs/plugin-react@6` declares `peer vite@"^8"`.
Bumping either alone deadlocks against the other, which is exactly what both logs say. Neither
PR can ever go green on its own, no matter how many times it is rebased. Applied **together**,
`tsc -b` and `vite build` both pass with **no source change** — vite 8 switches the bundler to
rolldown and the existing `manualChunks` configuration carries over untouched.

**#26 is blocked upstream and is not ours to fix.** The source typechecks *clean* under
TypeScript 7.0.2 — zero errors, verified — so the expected round of type fixes does not exist.
The blocker is lint: `typescript-eslint@8.66.0` is the current stable and peer-caps typescript
at `<6.1.0`, and the canary (`8.66.1-alpha.8`) caps it identically. Forced past the peer range
with `--legacy-peer-deps`, `eslint` does not misbehave subtly — it refuses to start:

> `Error: typescript-eslint does not support TS 7.0.`

pointing at [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940),
which tracks support for TS **>= 7.1**. There is no version combination that lints under TS
7.0 today. The only ways to take this bump are to stop linting or to pin two TypeScripts side
by side, and neither is worth it to be three weeks early.

**#21 is a real behavioural change, and the test was asserting a fiction.** Mantine 9
installs, typechecks and builds; on the pull request's own (older) base CI ran 45 tests and
44 passed. The one failure is
`every checkbox in the drawer is read-only`, which asserts
`toHaveJSProperty('readOnly', true)` on the rendered `<input>`.

In Mantine 8, `readOnly` was not a declared prop. It fell through `...others` onto the DOM
node, so the property was there to be read. In Mantine 9 it is a declared prop, destructured
and *acted on* — `onChange` returns early when it is set — and so it no longer reaches the
`<input>`.

The assertion that broke was never testing the guarantee it was named after. **HTML `readonly`
does not apply to checkboxes**; the specification lists it for text, password, date, number
and friends, and browsers ignore it on `type="checkbox"` entirely. Under Mantine 8 that
property was inert decoration. What actually kept those boxes from changing — then and now —
is that they are controlled by `checked={task.done}` with no writable source behind them.

So Mantine 9 *strengthens* the guarantee: the enforcement moved from an attribute the browser
ignores to a handler that runs. Verified by driving the real application — clicking a drawer
checkbox under Mantine 9 leaves it exactly as it was.

### What the constitution requires

Principle I is non-negotiable and names this case directly:

> Consequently the dashboard has no write affordances at all: no drag between columns, no
> ticking a checkbox, no editing a description. Every checkbox rendered is `readOnly`.

That still holds — every checkbox is still rendered `readOnly`, and the prop now does more
than it used to. The test must be repaired **upward**, to assert the guarantee the
constitution actually makes, not deleted to make the tick go green.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The board still refuses to be edited (Priority: P1)

Someone opens a feature drawer and clicks a task checkbox, because it looks like a checkbox.
Nothing happens, and nothing is written to their repository.

**Why this priority**: It is the first principle of the constitution, and the dependency bump
that triggered this work is the one that moved how it is enforced.

**Independent Test**: Click a checkbox in the drawer and confirm its state is unchanged.

**Acceptance Scenarios**:

1. **Given** the drawer's Tasks tab, **When** a checkbox is clicked, **Then** its checked
   state is unchanged.
2. **Given** the drawer's Tasks tab, **When** a checkbox is inspected, **Then** it is marked
   read-only in a way assistive technology can report.
3. **Given** the checklists in the Checklists tab, **When** their boxes are clicked, **Then**
   they are unchanged too.

### User Story 2 - The toolchain moves forward (Priority: P2)

The frontend builds on a current vite and a current Mantine, so the next weekly dependabot run
is not re-proposing the same four majors.

**Why this priority**: It is the request. It is also the difference between a queue that
drains and a queue that accumulates.

**Independent Test**: `npm ci`, `tsc -b`, `vite build` and `eslint .` all succeed, and the
full e2e suite is green.

**Acceptance Scenarios**:

1. **Given** the bumped manifest, **When** `npm ci` runs, **Then** it resolves with no peer
   conflict and no `--legacy-peer-deps`.
2. **Given** the bumped manifest, **When** the suite runs in CI, **Then** the whole e2e suite
   passes.

### User Story 3 - Coupled packages arrive coupled (Priority: P3)

The next time vite and its react plugin both go major, dependabot proposes them in one pull
request instead of two that block each other.

**Why this priority**: It costs four lines and removes the exact failure that made two of
these four red. Left alone, it recurs every time either package goes major.

**Independent Test**: `dependabot.yml` groups them; inspection is the test.

## Requirements *(mandatory)*

- **FR-001**: vite and `@vitejs/plugin-react` MUST be bumped in the same change; the manifest
  MUST install without `--legacy-peer-deps`.
- **FR-002**: Mantine MUST be bumped to 9, and every checkbox MUST remain non-interactive.
- **FR-003**: Read-only MUST be asserted by behaviour — clicking a checkbox does not change it
  — and not by a DOM property that browsers ignore on checkboxes.
- **FR-004**: Checkboxes MUST carry `aria-readonly`, so the guarantee is legible to assistive
  technology and to the test, which `readOnly` never made it.
- **FR-005**: typescript MUST stay on 5.8 until typescript-eslint supports 7.x. The reason
  MUST be recorded where the next person will look, so this is not re-investigated weekly.
- **FR-006**: `dependabot.yml` MUST group vite with its react plugin.

## Success Criteria *(mandatory)*

- **SC-001**: `npm ci` resolves cleanly on the default flags.
- **SC-002**: The e2e suite passes in CI, including a read-only test that fails if a checkbox
  ever becomes writable — verified by mutation, not assumed.
- **SC-003**: Three of the four red pull requests are closed by this change; the fourth is
  documented as blocked upstream rather than left to rot silently.

## Out of Scope

- Taking TypeScript 7 by dropping or forking lint.
- The eleven green pull requests, which are independent and merge on their own.
- Any change to what the board displays.

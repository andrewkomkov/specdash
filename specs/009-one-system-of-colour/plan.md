---
description: "Implementation plan for the visual redesign"
---

# Implementation Plan: One system of colour

**Branch**: `009-one-system-of-colour`

**Input**: [spec.md](./spec.md)

## Summary

A theme, a token file, and then a pass over five components that replaces ad-hoc colour and size
literals with the tokens. No component is rewritten and no behaviour moves: every change is either
"this hue now comes from a role" or "this literal now comes from the scale".

The order matters. Tokens first, then the components that consume them, then the two views that are
mostly chrome. Doing it the other way round means picking colours twice.

## Technical Context

**Language/Version**: TypeScript 6, React 19, Mantine 9

**Primary Dependencies**: none added. The brand palette becomes a Mantine colour scale plus CSS
custom properties; the charts in `Trend.tsx` are already hand-drawn SVG and need no library.

**Storage**: none. Colour scheme selection already lives in Mantine's own persistence.

**Testing**: the existing Playwright suite is the regression net for FR-020 — it asserts on
placement, counts, tabs, search and live updates, none of which this feature may disturb. Two of
its assertions name a colour deliberately being changed and are updated with the reason recorded.
Palette claims are verified by the validator, not by eye.

**Target Platform**: the same single container, same bundle, no new asset.

**Project Type**: web application; this feature is frontend-only.

**Performance Goals**: SC-006 caps CSS growth at 4 KB gzipped. Tokens are custom properties, which
cost bytes once rather than per component, and removing `projectColor` deletes a ten-entry table.

**Constraints**: Principle I is not at risk — nothing here reads or writes a scanned project — but
Principle VII is the whole point, and Principle II sets a limit: no restyling may hide the evidence
strings a card uses to explain its placement.

**Scale/Scope**: one new token file, one theme change, five components touched, one utility
removed.

## Constitution Check

**PASS.**

- **I. Read-only** — a frontend-only change; no path to a scanned project exists in any file
  touched. FR-021 keeps the *appearance* of read-only too, which is the part a restyle could
  plausibly break: nothing added here may look like a control.
- **II. Files are the truth, and every derived state carries its evidence** — the binding
  constraint. Stage reasons, `done/total` counts and finding messages all stay on screen and stay
  legible; the type scale exists partly because they were being set at 10px.
- **III. Tolerant parsing** — untouched.
- **IV. A project is a directory** — FR-005 removes the generated per-project hue, which was the
  only place the interface treated a project as a configured thing rather than a found one.
- **V. Live** — the flash-on-change and its reduced-motion fallback are preserved by FR-022.
- **VI. One container, no internet** — no font host, no CDN, no new asset. The brand palette is
  seven hex values in a stylesheet. FR-023 keeps the logo out, which also keeps the image free of
  a third party's mark.
- **VII. The board answers the portfolio question first** — this feature is that principle applied
  to colour. "A colour means the same thing everywhere" is currently false and becomes true.

No exception is claimed, so `Complexity Tracking` is empty by fact.

## Approach

### Step 1 — the token file

`frontend/src/theme.css`, imported once. Roles as custom properties on `:root`, with the dark set
declared twice — under `prefers-color-scheme: dark` guarded by `:not([data-theme="light"])`, and
under `[data-theme="dark"]` — so an explicit choice wins in both directions rather than only when
it agrees with the OS.

Mantine writes `data-mantine-color-scheme` rather than `data-theme`; the selectors follow what it
actually writes.

Roles: six stage steps, one progress hue, three status steps, four ink levels, three surfaces, one
border. The type scale ships as five properties beside them.

### Step 2 — the theme

`primaryColor` moves from `indigo` to a `brand` scale generated from `#2BB77B`. Mantine needs ten
steps; index 6 is the brand colour itself so `var(--mantine-color-brand-6)` is exactly `#2BB77B`.

### Step 3 — `utils.ts`

`progressColor` stops being a traffic light and returns the one progress hue. `projectColor` is
deleted, and its four call sites lose their accent argument rather than passing a constant.

### Step 4 — the card

Ring removed, bar kept. Title promoted to the display-adjacent step. Story badges lose
`PRIORITY_COLOR` and gain weight instead. Artefacts, contract count, checklist pill, finding badge
and timestamp collapse into one row.

### Step 5 — the header

A stat block: percentage at 28px, count and feature total beside it at 13px. Project chips lose
their hue and become neutral, checked/unchecked by fill — which is what the control actually means.

### Step 6 — columns

Each column takes its stage step as a top rule and a header dot. The empty state gains the sentence
that would put a card there, which the board already knows how to say because `_decide_stage`
writes those reasons.

### Step 7 — drawer and trend

The drawer's overview becomes a two-column grid above 900px. Trend gains a grid, axis labels and a
legend, and swaps its green for the progress token.

## Verification

- `npm run lint`, `tsc -b && vite build`.
- The full Playwright suite, with the two colour assertions updated and the reason recorded.
- The validator re-run on both ramps, against both surfaces, and the output pasted into the spec
  rather than summarised.
- The board opened in both schemes and at 1280px and 1920px, and looked at — the validator checks
  colour, not layout.

## Risks

**A restyle that quietly loses information.** The real danger is not ugliness, it is a card that
stops explaining itself. Principle II's evidence strings were among the smallest text on screen and
are the first thing a density pass would shrink further. Mitigated by making the type scale's floor
11px and by the Playwright suite, which reads those strings.

**Removing project colour is the one contentious call.** It follows from the measured fact that
past three slots the pairs cannot be told apart, and from the constitution's own words about a
colour meaning one thing. If it proves wrong in use, it is a single function and four call sites —
but it should be judged on the board, not in the abstract.

**Light mode is the mode nobody looks at.** Both ramps are validated, but only one gets used daily.
The verification step opens both deliberately for that reason.

## Complexity Tracking

*No constitutional violations are claimed for this feature.*

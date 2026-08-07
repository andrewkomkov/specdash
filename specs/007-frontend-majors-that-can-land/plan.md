---
description: "Implementation plan for the frontend major bumps"
---

# Implementation Plan: The frontend majors that can actually land

**Branch**: `007-frontend-majors-that-can-land`

**Input**: [spec.md](./spec.md)

## Approach

The investigation is done and is recorded in the spec; this plan is about the order things
happen in and what is checked at each step.

Four dependabot branches are not four changes. They are one change of three parts, and one
decision to defer. The work happens on a single branch because **#27 and #25 cannot be
verified separately** — either alone fails at `npm ci`, so there is no state of the tree in
which one of them is green and the other is not yet applied.

### Step 1 — vite 8 and plugin-react 6, together

One `npm install vite@^8 @vitejs/plugin-react@^6`. Both peer ranges are satisfied by the
pair, so the lockfile resolves on default flags.

Nothing in `vite.config.ts` is expected to change. vite 8 replaces the rollup bundler with
rolldown, which is the part of this bump with the standing to break something, so the check is
not "does it build" but "does it build the same shape": the `manualChunks` split into
`mantine`, `react`, `markdown` and `icons` must survive, because the chunking is what keeps
the initial payload small and a silent collapse into one bundle would pass CI unnoticed.

### Step 2 — Mantine 9

`npm install @mantine/core@^9 @mantine/hooks@^9`. Typecheck first, then build, then the full
e2e suite — the failure this bump causes is at runtime, and only the suite sees it.

### Step 3 — repair the read-only test upward

This is the only source change in the branch, and it is the one to get right, because the
tempting version of it is to delete an assertion until CI is quiet.

`toHaveJSProperty('readOnly', true)` goes, because it asserts a property the browser ignores
on checkboxes and so proves nothing about whether anything is editable. Two assertions replace
it:

- **`aria-readonly="true"`** — a semantic marker that is real for a checkbox, unlike
  `readonly`, and which Mantine passes through to the input. This gives assistive technology
  the fact the old attribute never conveyed.
- **clicking the box does not change it** — the guarantee itself, asserted against the running
  application, which no version of this test has ever checked.

The second is what the constitution's first principle actually promises, and it is what would
catch a future regression. It fails today if anyone makes a checkbox writable; the old
assertion would not have.

Both drawer tabs are covered — the Tasks tab and the Checklists tab are separate `Checkbox`
render sites in `FeatureDrawer.tsx`, and only the first was ever under test.

The test is only worth the change if it would catch a regression, so that is checked rather
than assumed: a checkbox mutated to be writable must fail it — including when it is left
labelled read-only, which is the case the old assertion would have waved through.

### Step 4 — typescript stays put, in writing

No version change. The finding — typescript-eslint refuses to start under TS 7.0, support is
tracked for >= 7.1 — is recorded in the spec and left as a comment beside the pin, so the next
person to see dependabot re-propose it does not repeat the investigation.

### Step 5 — group vite in dependabot

`dependabot.yml` already groups `@mantine/*` and the react packages. It does not group vite
with its plugin, which is precisely why two of these four arrived as mutually-blocking pull
requests. Four lines.

## Verification

| What | How |
|------|-----|
| No peer conflict | `npm ci` on default flags, as CI runs it |
| No type regression | `tsc -b --force` |
| Chunking survived rolldown | `vite build`, compare the emitted chunk names |
| Read-only still holds | the e2e suite against the real backend, not a mock |
| Lint still runs | `eslint .` |

The e2e suite is the one that matters here: it serves the real built frontend from the real
FastAPI backend over a fixture workspace, so a Mantine behaviour change is visible to it. A
unit test with a mocked component would have had nothing to say about any of this.

## Risks

**rolldown is new under vite 8.** The build succeeding is not by itself proof the output is
equivalent; the chunk-name check above is what turns it into proof. Beyond that, the e2e suite
runs against the built bundle rather than the dev server, so a bundler-specific breakage has
somewhere to show up.

**Mantine 9 across the whole UI, not just checkboxes.** The suite covers the drawer, the
board, search, i18n and the live-update path, which is most of what Mantine renders here.
55 tests is the evidence; it is not infinite.

**Deferring TypeScript means deferring it again next week.** Accepted. The alternative is
carrying a lint exception for a compiler we gain nothing from today.

# Contributing

Thank you for looking. SpecDash is small, opinionated and held to a written constitution —
which makes it easy to contribute to once you know the two or three rules it will not bend.

## The rules that will not bend

Read [`.specify/memory/constitution.md`](.specify/memory/constitution.md) first. The short
version:

1. **SpecDash never writes into a scanned project.** Not a cache, not a lock file, not a fix
   to a malformed `tasks.md`. A change that introduces a write path will be declined however
   useful it is.
2. **The files are the truth.** A feature's stage is derived from what is on disk, never from
   what a `**Status**` line claims, and every derived state carries the evidence that
   produced it.
3. **Tolerant parsing must not become inventive parsing.** Skipping something unrecognised is
   correct; guessing what it probably meant is not.
4. **The page loads nothing from the internet.** No CDN, no font host, no telemetry. A pull
   request adding a runtime dependency needs to argue for it.

## The workflow

This project is a spec-kit project and uses spec-kit on itself. Work goes through
`specs/NNN-slug/` — a spec, a plan and a task list — **before** the code, not after. There
is one retroactive spec in the history and its own file says so, because that omission is
exactly what this tool exists to catch.

A checkbox in a `tasks.md` is a claim about code. Tick it when the code exists and you have
checked it, and leave genuinely outstanding work unticked and say so.

## Running it

```bash
# backend
cd backend
python3.13 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
SPECDASH_ROOTS=$HOME/projects .venv/bin/python -m uvicorn app.main:app --reload --port 8420

# frontend
cd frontend && npm install && npm run dev     # :5173, proxies /api and /ws
```

## The gates

Both run in CI on every push, and both are the thing to run before opening a pull request.

```bash
cd backend && .venv/bin/python -m pytest      # 157 tests, and coverage must stay at 100%
cd frontend && npm run build                  # tsc -b, so this is the typecheck too
cd e2e && npx playwright test                 # 45 cases against the real application
```

Backend coverage is pinned at 100% in `pytest.ini`. That is a floor, not a claim of
correctness — it says every line has been executed, not that every behaviour is right. If a
line genuinely cannot be reached, exclude it and write down why at the exclusion site.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). release-please reads
them to decide the version and to write the changelog, so the type matters:
`feat`, `fix`, `perf` and `refactor` are user-visible; `docs`, `build`, `ci`, `test`,
`chore` and `style` are not.

Keep the description lowercase and imperative, with no trailing full stop.

## Translations

The interface dictionary is [`frontend/src/i18n.ts`](frontend/src/i18n.ts) — a flat object
per language, no library. English is the fallback, so a missing key renders readable English
rather than a dotted id. Adding a language means adding an object and a plural rule.

Do not translate anything read from a user's files. Feature titles, task text, summaries and
the scanner's evidence strings are their content and its output; translating them would mean
translating someone's own documents.

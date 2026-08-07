import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = path.join(here, 'fixtures', 'workspace')
export const WORKSPACE = path.join(here, '.tmp', 'workspace')

/**
 * The suite runs against a copy, not against the checked-in fixture.
 *
 * Two reasons. The live-update test has to write to a `tasks.md` — that is the
 * thing under test — and it must not dirty the repository to do it. And the
 * trend view's "available" branch needs a real git repository, which cannot be
 * checked in inside this one without becoming a submodule.
 */
export default function globalSetup() {
  fs.rmSync(WORKSPACE, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(WORKSPACE), { recursive: true })
  fs.cpSync(SOURCE, WORKSPACE, { recursive: true })

  makeRepository(path.join(WORKSPACE, 'atlas'))
}

/** Three revisions of one `tasks.md`, so the history walk has a series to find. */
function makeRepository(root: string) {
  const tasks = path.join(root, 'specs', '001-map-the-catalogue', 'tasks.md')
  const final = fs.readFileSync(tasks, 'utf8')

  // Walk the file backwards: untick the last two done tasks to make an earlier
  // revision, so completion rises across the three commits rather than jumping.
  const second = final.replace('- [x] T004', '- [ ] T004')
  const first = second.replace('- [x] T003', '- [ ] T003')

  git(root, 'init', '--initial-branch=main')
  git(root, 'config', 'user.email', 'e2e@specdash.test')
  git(root, 'config', 'user.name', 'SpecDash E2E')

  for (const [index, body] of [first, second, final].entries()) {
    fs.writeFileSync(tasks, body)
    git(root, 'add', '-A')
    git(
      root,
      '-c',
      `commit.gpgsign=false`,
      'commit',
      '--no-verify',
      '-m',
      `chore: fixture revision ${index + 1}`,
      // Fixed dates keep the series identical on every run.
      '--date',
      `2026-01-0${index + 1}T12:00:00+00:00`,
    )
  }
}

function git(cwd: string, ...args: string[]) {
  execFileSync('git', args, {
    cwd,
    stdio: 'pipe',
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: process.env.GIT_AUTHOR_DATE ?? '2026-01-01T12:00:00+00:00',
      GIT_COMMITTER_DATE: process.env.GIT_COMMITTER_DATE ?? '2026-01-01T12:00:00+00:00',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
    },
  })
}

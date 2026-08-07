import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..')

// A port of its own, so a developer with the container already up on 8420 is not
// broken by running the suite.
const PORT = Number(process.env.SPECDASH_E2E_PORT ?? 8431)

// The venv locally, the runner's interpreter in CI.
const python = process.env.SPECDASH_PYTHON ?? 'python3'

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // One backend process serves the whole run, and one test writes to the fixture
  // to exercise the watcher. Parallel workers would race over both.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // The real application: FastAPI parsing real files and serving the built
  // frontend. Mocking /api/snapshot would test nothing worth testing — every
  // interesting failure in this codebase has been at that seam.
  webServer: {
    command: `${python} -m uvicorn app.main:app --host 127.0.0.1 --port ${PORT} --no-access-log`,
    cwd: path.join(repo, 'backend'),
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // A copy, built by global-setup: one project is turned into a real git
      // repository, and the live-update test may write here without dirtying
      // the checked-in fixture.
      SPECDASH_ROOTS: path.join(here, '.tmp', 'workspace'),
      SPECDASH_STATIC: path.join(repo, 'frontend', 'dist'),
      SPECDASH_MAX_DEPTH: '2',
      // Bind mounts are not involved here, but polling is what ships, so it is
      // what the live-update test should be proving.
      WATCHFILES_FORCE_POLLING: '1',
      SPECDASH_POLL_DELAY_MS: '200',
      SPECDASH_DEBOUNCE_MS: '150',
    },
  },
})

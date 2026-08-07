import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { WORKSPACE } from '../global-setup'
import { column, gotoBoard } from './helpers'

const TASKS = path.join(WORKSPACE, 'orphan', 'specs', '001-no-git-here', 'tasks.md')

/**
 * The one test that writes. It writes into the suite's own copy of the fixture,
 * never into a scanned project of the user's — the read-only guarantee is about
 * what SpecDash does, and SpecDash is still only reading here.
 */
test.describe('the board follows the files', () => {
  let original: string

  test.beforeEach(() => {
    original = fs.readFileSync(TASKS, 'utf8')
  })

  test.afterEach(async () => {
    fs.writeFileSync(TASKS, original)
  })

  test('ticking a box on disk moves the card without a reload', async ({ page }) => {
    await gotoBoard(page)

    const card = page.getByTestId('feature-card').filter({ hasText: 'No git here' })
    await expect(column(page, 'implement').getByTestId('feature-card')).toHaveCount(2)
    await expect(card).toContainText('1/2')

    fs.writeFileSync(TASKS, original.replace('- [ ] T002', '- [x] T002'))

    // Wait on the board, never on a timer: the watcher polls and debounces, and
    // a sleep long enough to be safe would be long enough to be useless.
    await expect(column(page, 'done').getByTestId('feature-card')).toHaveCount(2, {
      timeout: 20_000,
    })
    await expect(column(page, 'done')).toContainText('No git here')
    await expect(column(page, 'implement').getByTestId('feature-card')).toHaveCount(1)
  })

  test('the manual refresh works when nothing has changed', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('button').nth(1).click() // the refresh icon
    await expect(page.getByTestId('feature-card')).toHaveCount(5)
  })

  test('the connection indicator reports the live socket', async ({ page }) => {
    await gotoBoard(page)
    await expect(page.getByRole('banner')).toContainText('live')
  })
})

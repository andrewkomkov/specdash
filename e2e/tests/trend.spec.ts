import { expect, test } from '@playwright/test'
import { gotoBoard, setGrain } from './helpers'

test.describe('the trend view shows movement, or says it cannot', () => {
  test('a project under git gets a series drawn from its commits', async ({ page }) => {
    await gotoBoard(page)
    await setGrain(page, 'Trend')

    const atlas = page.locator('div').filter({ hasText: /^atlas/ }).first()
    await expect(page.getByText('reading git history…').first()).toHaveCount(0, { timeout: 15_000 })

    // global-setup made three commits, each ticking one more task.
    const chart = page.locator('svg[role="img"]').first()
    await expect(chart).toBeVisible()
    await expect(chart.locator('circle')).toHaveCount(3)
    await expect(page.getByText('a point is a commit that touched specs/').first()).toBeVisible()
    await expect(atlas).toBeVisible()
  })

  test('the series says how far it has come', async ({ page }) => {
    await gotoBoard(page)
    await setGrain(page, 'Trend')

    // The first commit had 2 of 7 ticked, the last 4 of 7.
    await expect(page.getByText('4/7 · 57%')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/\+2 over 3 commits/)).toBeVisible()
  })

  test('a project not under git says so rather than drawing an empty chart', async ({ page }) => {
    await gotoBoard(page)
    await setGrain(page, 'Trend')

    const cards = page.getByText('History unavailable')
    // beacon and orphan are both outside git in the fixture copy.
    await expect(cards.first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('this project is not a git repository').first()).toBeVisible()
  })

  test('the stale-work list names the features nothing has touched', async ({ page }) => {
    await gotoBoard(page)
    await setGrain(page, 'Trend')

    await expect(page.getByText('Longest without a commit').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Map the catalogue').first()).toBeVisible()
  })

  test('switching back to a board leaves the trend behind', async ({ page }) => {
    await gotoBoard(page)
    await setGrain(page, 'Trend')
    await expect(page.getByTestId('column-done')).toHaveCount(0)

    await setGrain(page, 'Features')
    await expect(page.getByTestId('column-done')).toBeVisible()
  })
})

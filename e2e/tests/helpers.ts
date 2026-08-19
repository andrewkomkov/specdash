import { expect, type Locator, type Page } from '@playwright/test'

export type Stage = 'specify' | 'clarify' | 'plan' | 'tasks' | 'implement' | 'done'

export function column(page: Page, stage: Stage): Locator {
  return page.getByTestId(`column-${stage}`)
}

/** Open the board with a clean slate: no hidden projects, no remembered grain. */
export async function gotoBoard(page: Page, grain: 'features' | 'stories' = 'features') {
  // Seed once per context: this runs on every navigation, so an unguarded
  // version would quietly undo whatever a reload is supposed to be proving.
  await page.addInitScript((chosen) => {
    if (window.localStorage.getItem('specdash-e2e-seeded')) return
    window.localStorage.setItem('specdash-hidden-projects', '[]')
    window.localStorage.setItem('specdash-view', JSON.stringify(chosen))
    window.localStorage.setItem('specdash-e2e-seeded', '1')
  }, grain)
  await page.goto('/')
  await expect(page.getByRole('banner')).toContainText('live', { timeout: 15_000 })
  // The first paint comes from GET /api/snapshot; wait for the board itself.
  await expect(page.getByTestId('column-specify')).toBeVisible()
}

export function setGrain(page: Page, label: 'Features' | 'Stories' | 'Trend' | 'Динамика') {
  return page.getByRole('banner').getByText(label, { exact: true }).click()
}

export async function search(page: Page, text: string) {
  const input = page.locator('#specdash-search')
  await input.fill(text)
  // The input is debounced by 150ms before the board re-filters.
  await page.waitForTimeout(300)
}

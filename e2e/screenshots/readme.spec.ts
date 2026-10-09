import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gotoBoard, setGrain } from '../tests/helpers'

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'assets')

function shot(page: Page, name: string) {
  return page.screenshot({ path: path.join(assets, `${name}.png`) })
}

async function openAtlas(page: Page) {
  await page.getByTestId('feature-card').filter({ hasText: 'Map the catalogue' }).first().click()
  const drawer = page.getByRole('dialog')
  await expect(drawer).toContainText('4/7 tasks ticked')
  return drawer
}

test('board-features', async ({ page }) => {
  await gotoBoard(page, 'features')
  await shot(page, 'board-features')
})

test('board-stories', async ({ page }) => {
  await gotoBoard(page, 'stories')
  await shot(page, 'board-stories')
})

test('drawer-overview', async ({ page }) => {
  await gotoBoard(page)
  await openAtlas(page)
  await page.waitForTimeout(400) // the drawer slides in
  await shot(page, 'drawer-overview')
})

test('drawer-tasks', async ({ page }) => {
  await gotoBoard(page)
  const drawer = await openAtlas(page)
  await drawer.getByRole('tab', { name: 'Tasks' }).click()
  await expect(drawer.getByText('T003', { exact: true })).toBeVisible()
  await page.waitForTimeout(400)
  await shot(page, 'drawer-tasks')
})

test('trend', async ({ page }) => {
  await gotoBoard(page)
  await setGrain(page, 'Trend')
  await expect(page.locator('svg[role="img"]').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('reading git history…')).toHaveCount(0, { timeout: 15_000 })
  await page.waitForTimeout(400)
  await shot(page, 'trend')
})

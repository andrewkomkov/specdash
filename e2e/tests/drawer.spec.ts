import { expect, test } from '@playwright/test'
import { column, gotoBoard } from './helpers'

test.describe('the drawer reads a feature end to end', () => {
  test('a feature card opens the overview, built from spec.md', async ({ page }) => {
    await gotoBoard(page)
    await column(page, 'implement')
      .getByTestId('feature-card')
      .filter({ hasText: 'Map the catalogue' })
      .click()

    const drawer = page.getByRole('dialog')
    await expect(drawer).toContainText('Map the catalogue')
    await expect(drawer).toContainText('4/7 tasks ticked')
    await expect(drawer).toContainText('Half the work is done')
    await expect(drawer).toContainText('FR-001')
    await expect(drawer).toContainText('SC-001')
    await expect(drawer).toContainText('2 FR')
  })

  test('the task list groups by phase and filters to the unfinished', async ({ page }) => {
    await gotoBoard(page)
    await column(page, 'implement')
      .getByTestId('feature-card')
      .filter({ hasText: 'Map the catalogue' })
      .click()

    const drawer = page.getByRole('dialog')
    await drawer.getByRole('tab', { name: 'Tasks' }).click()
    await expect(drawer.getByText('T003', { exact: true })).toBeVisible()

    await drawer.getByRole('switch').check()
    await expect(drawer.getByText('T003', { exact: true })).toHaveCount(0)
    await expect(drawer.getByText('T005', { exact: true })).toBeVisible()
  })

  test('every checkbox in the drawer is read-only', async ({ page }) => {
    await gotoBoard(page)
    await column(page, 'implement')
      .getByTestId('feature-card')
      .filter({ hasText: 'Map the catalogue' })
      .click()

    const drawer = page.getByRole('dialog')
    await drawer.getByRole('tab', { name: 'Tasks' }).click()

    const boxes = drawer.getByRole('checkbox')
    const count = await boxes.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i += 1) {
      await expect(boxes.nth(i)).toHaveJSProperty('readOnly', true)
    }
  })

  test('checklists and documents render from the files', async ({ page }) => {
    await gotoBoard(page)
    await column(page, 'implement')
      .getByTestId('feature-card')
      .filter({ hasText: 'Map the catalogue' })
      .click()

    const drawer = page.getByRole('dialog')
    await drawer.getByRole('tab', { name: 'Checklists' }).click()
    await expect(drawer).toContainText('Every requirement has an id')
    await expect(drawer).toContainText('1/2')

    await drawer.getByRole('tab', { name: 'Documents' }).click()
    // The panel opens on spec.md, which is the document people want first.
    await expect(drawer).toContainText('Feature Specification: Map the catalogue')
    await expect(drawer).toContainText('Checklist · requirements')

    await drawer.getByText('Plan', { exact: true }).click()
    await expect(drawer).toContainText('A layout pass and a viewport')
  })

  test('history says plainly when a project is not under git', async ({ page }) => {
    await gotoBoard(page)
    await column(page, 'implement')
      .getByTestId('feature-card')
      .filter({ hasText: 'No git here' })
      .click()

    const drawer = page.getByRole('dialog')
    await drawer.getByRole('tab', { name: 'History' }).click()
    await expect(drawer).toContainText('No commits found')
  })

  test('an open question in the spec is surfaced, not buried', async ({ page }) => {
    await gotoBoard(page)
    await column(page, 'implement')
      .getByTestId('feature-card')
      .filter({ hasText: 'No git here' })
      .click()

    await expect(page.getByRole('dialog')).toContainText('open question')
    await expect(page.getByRole('dialog')).toContainText('should it offer to initialise one?')
  })

  test('a story card opens its feature with that story expanded', async ({ page }) => {
    await gotoBoard(page, 'stories')
    await page.getByTestId('story-card').filter({ hasText: 'Zoom without redrawing' }).click()

    const drawer = page.getByRole('dialog')
    await expect(drawer).toContainText('Map the catalogue')

    // Assert on expansion, not on text: an accordion keeps collapsed panels in
    // the DOM, so their content is present whether or not anyone can read it.
    const opened = drawer.getByRole('button', { name: /Zoom without redrawing/ })
    const closed = drawer.getByRole('button', { name: /Draw the map/ })
    await expect(opened).toHaveAttribute('aria-expanded', 'true')
    await expect(closed).toHaveAttribute('aria-expanded', 'false')
    await expect(drawer.getByText('nothing is re-fetched')).toBeVisible()
    await expect(drawer.getByText('every entry has a position')).toBeHidden()
  })

  test('the leftover card opens the task list, which has a row for it', async ({ page }) => {
    await gotoBoard(page, 'stories')
    await page
      .getByTestId('story-card')
      .filter({ hasText: 'Tasks with no story' })
      .first()
      .click()

    const drawer = page.getByRole('dialog')
    await expect(drawer.getByRole('tab', { name: 'Tasks' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('escape closes the drawer', async ({ page }) => {
    await gotoBoard(page)
    await column(page, 'done').getByTestId('feature-card').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

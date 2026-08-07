import { expect, test } from '@playwright/test'
import { column, gotoBoard } from './helpers'

test.describe('the board places every feature by its files', () => {
  test.beforeEach(async ({ page }) => {
    await gotoBoard(page)
  })

  test('a spec on its own lands in Specify', async ({ page }) => {
    const card = column(page, 'specify').getByTestId('feature-card')
    await expect(card).toHaveCount(1)
    await expect(card).toHaveAttribute('data-feature', 'atlas/003-just-a-spec')
    await expect(card).toContainText('Just a spec')
  })

  test('a plan with no task list lands in Plan', async ({ page }) => {
    const card = column(page, 'plan').getByTestId('feature-card')
    await expect(card).toHaveCount(1)
    await expect(card).toHaveAttribute('data-feature', 'atlas/002-planned-not-cut')
  })

  test('a part-ticked task list lands in Implement', async ({ page }) => {
    const cards = column(page, 'implement').getByTestId('feature-card')
    await expect(cards).toHaveCount(2)
    await expect(cards.first()).toBeVisible()
    const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-feature')))
    expect(ids.sort()).toEqual(['atlas/001-map-the-catalogue', 'orphan/001-no-git-here'])
  })

  test('a fully ticked task list lands in Done', async ({ page }) => {
    const card = column(page, 'done').getByTestId('feature-card')
    await expect(card).toHaveCount(1)
    await expect(card).toHaveAttribute('data-feature', 'beacon/001-signal-quality')
  })

  test('Clarify and Tasks are empty, and say so rather than looking broken', async ({ page }) => {
    await expect(column(page, 'clarify').getByTestId('feature-card')).toHaveCount(0)
    await expect(column(page, 'clarify')).toContainText('пусто')
    await expect(column(page, 'tasks').getByTestId('feature-card')).toHaveCount(0)
  })

  test('the column subtitle counts the tasks of the cards in it', async ({ page }) => {
    // atlas/001 is 4/7 and orphan/001 is 1/2 — the column says 5/9.
    await expect(column(page, 'implement')).toContainText('5/9 задач в колонке')
    await expect(column(page, 'done')).toContainText('6/6 задач в колонке')
  })

  test('the header counts every project, and the feature named by feature.json is marked', async ({
    page,
  }) => {
    // 4 + 6 + 2 = 12 tasks across the fixture, 11 of them ticked... minus the
    // three unticked ones: atlas 4/7, beacon 6/6, orphan 1/2 => 11/15.
    await expect(page.getByRole('banner')).toContainText('11/15 задач')
    await expect(page.getByRole('banner')).toContainText('5 фич')

    const current = page.getByTestId('feature-card').filter({ hasText: 'current' })
    await expect(current).toHaveCount(2) // atlas/001 and beacon/001
  })

  test('a card explains why it sits where it does', async ({ page }) => {
    await column(page, 'done').getByTestId('feature-card').click()
    await expect(page.getByText('all 6 tasks ticked')).toBeVisible()
  })

  test('hiding a project removes its cards', async ({ page }) => {
    await expect(page.getByTestId('feature-card')).toHaveCount(5)
    // Mantine renders the chip as a hidden input plus a label; the label is the
    // thing a person clicks.
    await page.getByRole('banner').locator('label').filter({ hasText: 'atlas' }).click()
    await expect(page.getByTestId('feature-card')).toHaveCount(2)
  })
})

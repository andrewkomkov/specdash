import { expect, test } from '@playwright/test'
import { column, gotoBoard } from './helpers'

/**
 * The language is chosen in the browser, from the browser's own preference and
 * from `localStorage`. Neither behaves like itself outside a real one, which is
 * why this is an end-to-end test and not a unit test.
 */
test.describe('the board speaks the reader’s language', () => {
  test('an English browser gets an English board', async ({ page }) => {
    await gotoBoard(page)

    await expect(page.getByRole('banner')).toContainText('spec-kit · read-only')
    await expect(page.getByRole('banner')).toContainText('Features')
    await expect(column(page, 'clarify')).toContainText('empty')
    await expect(column(page, 'implement')).toContainText('tasks in this column')
  })

  test('the language can be switched, and the whole interface follows', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()

    await expect(page.getByRole('banner')).toContainText('spec-kit · только чтение')
    await expect(page.getByRole('banner')).toContainText('Фичи')
    await expect(column(page, 'clarify')).toContainText('пусто')
    await expect(column(page, 'implement')).toContainText('задач в колонке')
  })

  test('the chosen language survives a reload', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()
    await expect(page.getByRole('banner')).toContainText('Фичи')

    await page.reload()
    await expect(page.getByRole('banner')).toContainText('Фичи')
  })

  test('a counted noun agrees with its number', async ({ page }) => {
    await gotoBoard(page)
    await expect(page.getByRole('banner')).toContainText('5 features')

    await page.locator('#specdash-search').fill('catalogue')
    await expect(page.getByRole('banner')).toContainText('1 feature')
    await expect(page.getByRole('banner')).not.toContainText('1 features')
  })

  test('Russian counted nouns take all three forms', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()

    await expect(page.getByRole('banner')).toContainText('5 фич')

    await page.locator('#specdash-search').fill('catalogue')
    await expect(page.getByRole('banner')).toContainText('1 фича')

    await page.locator('#specdash-search').fill('feature')
    await expect(page.getByRole('banner')).toContainText(/[234] фичи/)
  })

  test('a browser asking for a language we do not have falls back to English', async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: 'fr-FR' })
    const page = await context.newPage()
    await page.goto('/')

    await expect(page.getByRole('banner')).toContainText('spec-kit · read-only')
    await context.close()
  })

  test('the user’s own writing is never translated', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()

    // Titles come from spec.md and evidence strings from the scanner; both stay
    // exactly as they were written.
    await expect(column(page, 'done')).toContainText('Signal quality')
    await column(page, 'done').getByTestId('feature-card').click()
    await expect(page.getByRole('dialog')).toContainText('all 6 tasks ticked')
  })
})

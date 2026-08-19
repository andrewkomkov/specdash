import { expect, test } from '@playwright/test'
import { column, gotoBoard, setGrain } from './helpers'

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
    await expect(column(page, 'clarify')).toContainText('Nothing is clarified')
    await expect(column(page, 'implement')).toContainText('tasks in this column')
  })

  test('the language can be switched, and the whole interface follows', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()

    await expect(page.getByRole('banner')).toContainText('spec-kit · только чтение')
    await expect(page.getByRole('banner')).toContainText('Фичи')
    await expect(column(page, 'clarify')).toContainText('Пока нет ничего уточнённого')
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

  test('a counted noun agrees with its number in every Russian form', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()

    // The noun bends around the total beside it, which is the form the old
    // dictionary could not express at all: nine takes `задач`, three takes
    // `задачи`, and both are read off the board rather than asserted about the
    // function that produced them.
    await expect(column(page, 'implement')).toContainText('5/9 задач в колонке')
    await expect(column(page, 'done')).toContainText('6/6 задач в колонке')

    await column(page, 'implement')
      .getByTestId('feature-card')
      .filter({ hasText: 'Map the catalogue' })
      .click()
    await expect(page.getByRole('dialog')).toContainText('2/3 задачи')
  })

  test('the interface never spells a plural with a bracket', async ({ page }) => {
    await gotoBoard(page)
    await expect(page.locator('body')).not.toContainText('(s)')

    await page.getByRole('banner').getByText('RU', { exact: true }).click()
    await expect(page.locator('body')).not.toContainText('(s)')
  })

  test('the connection indicator speaks Russian too', async ({ page }) => {
    await gotoBoard(page)
    await expect(page.getByRole('banner')).toContainText('live')

    await page.getByRole('banner').getByText('RU', { exact: true }).click()
    await expect(page.getByRole('banner')).toContainText('на связи')
    await expect(page.getByRole('banner')).not.toContainText('live')
  })

  test('the six column headers are translated', async ({ page }) => {
    await gotoBoard(page)
    await expect(column(page, 'implement')).toContainText('Implement')

    await page.getByRole('banner').getByText('RU', { exact: true }).click()
    await expect(column(page, 'implement')).toContainText('Реализация')
    await expect(column(page, 'done')).toContainText('Готово')
  })

  test('the document is marked as being in the language it is written in', async ({ page }) => {
    await gotoBoard(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.getByRole('banner').getByText('RU', { exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
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

  test('no English label survives the switch to Russian', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()

    // Every one of these was on a Russian board before this was written. The
    // assertions are scoped to what SpecDash writes: the fixture's own spec.md
    // says "belongs in Specify", and that sentence is the user's, not ours.
    const banner = page.getByRole('banner')
    for (const english of ['Features', 'Stories', 'Trend', 'live', 'Search']) {
      await expect(banner).not.toContainText(english)
    }

    await expect(column(page, 'implement')).not.toContainText('tasks in this column')
    await expect(column(page, 'clarify')).not.toContainText('Nothing is clarified')
    await expect(column(page, 'tasks')).not.toContainText('Nothing has tasks cut')
  })

  test('prose the backend composed is translated too', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()

    // A finding is a sentence SpecDash writes about a feature, so it crosses
    // the wire as a key and its variables rather than as English only.
    const card = column(page, 'plan').getByTestId('feature-card')
    await expect(card.getByTestId('finding-badge')).toHaveText('1 блокер')

    await card.click()
    await page.getByRole('tab', { name: 'Проверки' }).click()
    await expect(
      page.getByText('В plan.md записана не пройденная проверка конституции'),
    ).toBeVisible()

    // And so does the label of a document, while the file it names does not.
    await page.getByRole('tab', { name: 'Документы' }).click()
    await expect(page.getByText('Спецификация', { exact: true }).first()).toBeVisible()
  })

  test('a project outside git says why in Russian', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()
    await setGrain(page, 'Динамика')

    await expect(page.getByText('История недоступна').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Проект не под управлением git.').first()).toBeVisible()
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

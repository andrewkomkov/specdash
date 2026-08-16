import { expect, test, type Page } from '@playwright/test'
import { gotoBoard } from './helpers'

/**
 * A column is the claim the board makes about a card: this feature is at this
 * stage. A card wider than the column it was drawn in breaks that claim — it
 * lies across the neighbouring stage, and the six columns stop reading as six
 * columns.
 *
 * The property is checked geometrically rather than by screenshot, because the
 * widths that break it come from content: a long project id, a Russian date, a
 * feature that has contracts *and* checklists. Any of those may grow again.
 */

/** Every card whose box is not fully inside the column it belongs to. */
function escapees(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="feature-card"], [data-testid="story-card"]')]
      .map((card) => {
        const column = card.closest('[data-testid^="column-"]')!
        const c = card.getBoundingClientRect()
        const k = column.getBoundingClientRect()
        const id = card.getAttribute('data-feature') ?? card.getAttribute('data-story')
        // A pixel of tolerance: sub-pixel layout is not a defect.
        return c.left < k.left - 1 || c.right > k.right + 1
          ? `${id} is ${Math.round(c.width)}px wide in a ${Math.round(k.width)}px column`
          : ''
      })
      .filter(Boolean),
  )
}

/**
 * Anything inside a column that has grown wide enough to scroll sideways. Only
 * genuine scroll containers count: a badge whose long label is ellipsised also
 * reports `scrollWidth > clientWidth`, and that is the truncation working.
 */
function sidewaysScrollers(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="column-"] *')]
      .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
      .filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX))
      .map((el) => `${el.tagName}.${el.getAttribute('class') ?? ''}: ${el.scrollWidth} > ${el.clientWidth}`),
  )
}

test.describe('a card is drawn inside its column', () => {
  test('no feature card is wider than its column', async ({ page }) => {
    await gotoBoard(page)
    expect(await escapees(page)).toEqual([])
    expect(await sidewaysScrollers(page)).toEqual([])
  })

  test('no story card is wider than its column', async ({ page }) => {
    await gotoBoard(page, 'stories')
    expect(await escapees(page)).toEqual([])
    expect(await sidewaysScrollers(page)).toEqual([])
  })

  test('Russian is longer than English, and still fits', async ({ page }) => {
    await gotoBoard(page)
    await page.getByRole('banner').getByText('RU', { exact: true }).click()
    await expect(page.getByRole('banner')).toContainText('Фичи')

    expect(await escapees(page)).toEqual([])
    expect(await sidewaysScrollers(page)).toEqual([])
  })

  test('the documents row wraps rather than dropping what it carries', async ({ page }) => {
    await gotoBoard(page)
    // atlas/001 is the widest footer the fixture can make: four document
    // icons, a contract and a checklist figure, and the age of the feature.
    // It is the card that pushed itself out of the column.
    const card = page.locator('[data-feature="atlas/001-map-the-catalogue"]')
    await expect(card).toContainText('1c')
    await expect(card).toContainText('50%')
    await expect(card.getByText(/ago|just now/)).toBeVisible()
  })
})

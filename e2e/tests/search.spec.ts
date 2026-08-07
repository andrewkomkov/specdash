import { expect, test } from '@playwright/test'
import { gotoBoard } from './helpers'

const palette = 'input[placeholder^="Search specs"]'

async function openPalette(page: import('@playwright/test').Page, query: string) {
  await page.locator('[data-testid="open-search"]').click()
  await expect(page.locator(palette)).toBeVisible()
  await page.locator(palette).fill(query)
}

test.describe('search reads the documents', () => {
  test('a phrase that exists only in a document body is findable', async ({ page }) => {
    await gotoBoard(page)
    // This sentence is in plan.md and nowhere in the snapshot: the feature's
    // summary comes from spec.md, so nothing before this feature could find it.
    await openPalette(page, 'layout pass and a viewport')

    const hits = page.getByTestId('search-hit')
    await expect(hits.first()).toBeVisible()
    await expect(hits.first()).toContainText('Plan')
    await expect(hits.first()).toContainText('layout pass')
  })

  test('the match is shown in context and highlighted', async ({ page }) => {
    await gotoBoard(page)
    await openPalette(page, 'viewport')

    // The top hit may be a task, whose title is the whole content and needs no
    // excerpt; the marked excerpt belongs to the document hits below it.
    await expect(page.getByTestId('search-hit').locator('mark').first()).toBeVisible()
  })

  test('hits are labelled by kind', async ({ page }) => {
    await gotoBoard(page)
    await openPalette(page, 'zoom')
    // evaluateAll does not auto-wait the way an expectation does.
    await expect(page.getByTestId('search-hit').first()).toBeVisible()

    const kinds = await page
      .getByTestId('search-hit')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.split('\n')[0].trim().toLowerCase()))

    expect(kinds.length).toBeGreaterThan(0)
    expect(new Set(kinds).size).toBeGreaterThan(1)
    for (const kind of kinds) {
      expect(['story', 'task', 'document', 'feature', 'req', 'checklist']).toContain(kind)
    }
  })

  test('punctuation is searched for, not obeyed as syntax', async ({ page }) => {
    await gotoBoard(page)
    // `-` is an operator to FTS5 and made it raise before the escaping existed.
    await openPalette(page, 'read-only')

    await expect(page.locator(palette)).toHaveValue('read-only')
    await expect(page.getByText('Nothing matches').or(page.getByTestId('search-hit').first())).toBeVisible()
  })

  test('a misspelling is answered with a correction rather than an empty page', async ({ page }) => {
    await gotoBoard(page)
    // Not `cataloge`, which the porter stemmer resolves on its own — a
    // transposition is what actually leaves the index with nothing.
    await openPalette(page, 'catalgue')

    await expect(page.getByText('Did you mean')).toBeVisible()
    await expect(page.getByText('catalogue', { exact: true })).toBeVisible()
  })

  test('choosing a document opens the feature on that document', async ({ page }) => {
    await gotoBoard(page)
    await openPalette(page, 'layout pass and a viewport')
    await page.getByTestId('search-hit').first().click()

    // The palette is a dialog too, so the drawer is the one that remains.
    const drawer = page.getByRole('dialog').last()
    await expect(drawer).toContainText('Map the catalogue')
    await expect(drawer.getByRole('tab', { name: 'Documents' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(drawer).toContainText('A layout pass and a viewport')
  })

  test('the palette is driven entirely from the keyboard', async ({ page }) => {
    await gotoBoard(page)
    await page.keyboard.press('ControlOrMeta+k')
    await expect(page.locator(palette)).toBeVisible()

    await page.locator(palette).fill('Lay entries out')
    await expect(page.getByTestId('search-hit').first()).toBeVisible()

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog').last()).toContainText('Map the catalogue')
  })

  test('escape closes the palette and leaves the board alone', async ({ page }) => {
    await gotoBoard(page)
    await openPalette(page, 'map')
    await page.keyboard.press('Escape')

    await expect(page.locator(palette)).toHaveCount(0)
    await expect(page.getByTestId('feature-card')).toHaveCount(5)
  })

  test('the header filter still narrows the board, untouched', async ({ page }) => {
    await gotoBoard(page)
    await page.locator('#specdash-search').fill('catalogue')

    await expect(page.getByTestId('feature-card')).toHaveCount(1)
    await expect(page.locator(palette)).toHaveCount(0)
  })
})

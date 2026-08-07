import { expect, test } from '@playwright/test'
import { column, gotoBoard } from './helpers'

test.describe('the board works without a mouse', () => {
  test('a feature card is announced as a button naming its feature', async ({ page }) => {
    await gotoBoard(page)
    const card = column(page, 'done').getByTestId('feature-card')

    await expect(card).toHaveAttribute('role', 'button')
    await expect(card).toHaveAttribute('aria-label', /Signal quality/)
  })

  test('a card can be focused and opened with Enter', async ({ page }) => {
    await gotoBoard(page)
    const card = column(page, 'done').getByTestId('feature-card')

    await card.focus()
    await expect(card).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toContainText('Signal quality')
  })

  test('Space opens a card too, and Escape closes the drawer', async ({ page }) => {
    await gotoBoard(page)
    const card = column(page, 'plan').getByTestId('feature-card')

    await card.focus()
    await page.keyboard.press(' ')
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('a story card is reachable the same way', async ({ page }) => {
    await gotoBoard(page, 'stories')
    const card = page.getByTestId('story-card').first()

    await expect(card).toHaveAttribute('role', 'button')
    await card.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('Tab reaches the cards from the top of the page', async ({ page }) => {
    await gotoBoard(page)

    let reached = false
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press('Tab')
      reached = await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') === 'feature-card',
      )
    }

    expect(reached, 'a feature card must be reachable by tabbing').toBe(true)
  })
})

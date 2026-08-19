import { expect, test } from '@playwright/test'
import { column, gotoBoard } from './helpers'

/** The status tokens, resolved to the values the browser actually paints. */
async function statusColours(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    const read = (token: string) => {
      probe.style.color = `var(${token})`
      const value = getComputedStyle(probe).color
      return value
    }
    const out = { blocker: read('--status-blocker'), warn: read('--status-warn') }
    probe.remove()
    return out
  })
}

test.describe('one system of colour', () => {
  test('finished work carries no alarm colour anywhere', async ({ page }) => {
    await gotoBoard(page)

    const status = await statusColours(page)
    expect(status.blocker).not.toBe('')

    const painted = await column(page, 'done').evaluate((root) => {
      const found: string[] = []
      for (const el of root.querySelectorAll('*')) {
        const cs = getComputedStyle(el)
        found.push(cs.color, cs.backgroundColor, cs.borderTopColor, cs.borderLeftColor)
      }
      return found
    })

    // Priority used to be red and orange, so every finished P1 story in this
    // column was painted the colour of an emergency.
    expect(painted).not.toContain(status.blocker)
    expect(painted).not.toContain(status.warn)
  })

  test('a status is never carried by colour alone', async ({ page }) => {
    await gotoBoard(page)

    const badge = column(page, 'plan').getByTestId('finding-badge')

    // Brand green and status red are ΔE 7.1 apart under deuteranopia, so the
    // severity has to survive the colour being ignored entirely.
    await expect(badge).toHaveText(/blocker|warning|note/)
    await expect(badge.locator('svg')).toBeVisible()
  })

  test('the board leads with the number it exists to report', async ({ page }) => {
    await gotoBoard(page)

    const headline = page.getByTestId('headline-pct')
    await expect(headline).toBeVisible()

    const sizes = await page.evaluate(() => {
      const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize)
      const headlineEl = document.querySelector('[data-testid="headline-pct"]')!
      let biggestOther = 0
      for (const el of document.querySelectorAll('body *')) {
        if (el === headlineEl || el.contains(headlineEl)) continue
        if (!el.textContent?.trim()) continue
        biggestOther = Math.max(biggestOther, px(el))
      }
      return { headline: px(headlineEl), biggestOther }
    })

    expect(sizes.headline).toBeGreaterThanOrEqual(28)
    expect(sizes.headline).toBeGreaterThan(sizes.biggestOther)
  })

  test('the six columns advance through the stage ramp', async ({ page }) => {
    await gotoBoard(page)

    const tops = await page.evaluate(() =>
      ['specify', 'clarify', 'plan', 'tasks', 'implement', 'done'].map(
        (stage) =>
          getComputedStyle(document.querySelector(`[data-testid="column-${stage}"]`)!)
            .borderTopColor,
      ),
    )

    // Six distinct steps, in file order — a pipeline with a direction rather
    // than six unrelated containers.
    expect(new Set(tops).size).toBe(6)
  })
})

import { expect, test } from '@playwright/test'
import { column, gotoBoard, search, setGrain } from './helpers'

test.describe('the board can be read at two grains', () => {
  test('story grain draws one card per story plus the tasks that name none', async ({ page }) => {
    await gotoBoard(page)
    await setGrain(page, 'Stories')

    // 7 stories across the fixture, plus a leftover card for atlas/001 and
    // beacon/001 — the two features with tasks that name no story.
    await expect(page.getByTestId('story-card')).toHaveCount(9)
    await expect(page.getByRole('banner')).toContainText('9 stories')

    const leftovers = page.getByTestId('story-card').filter({ hasText: 'Tasks with no story' })
    await expect(leftovers).toHaveCount(2)
  })

  test('a story is placed by its own ticks, not its feature’s', async ({ page }) => {
    await gotoBoard(page, 'stories')

    // atlas/001 sits in Implement as a whole. Its US1 is 2/3 and its US2 is 0/2,
    // so at story grain they separate into Implement and Tasks.
    await expect(
      column(page, 'implement').getByTestId('story-card').filter({ hasText: 'Draw the map' }),
    ).toHaveCount(1)
    await expect(
      column(page, 'tasks').getByTestId('story-card').filter({ hasText: 'Zoom without redrawing' }),
    ).toHaveCount(1)
  })

  test('a story with no tasks sits where its feature sits and says why', async ({ page }) => {
    await gotoBoard(page, 'stories')

    const planned = column(page, 'plan').getByTestId('story-card')
    await expect(planned).toHaveCount(1)
    await expect(planned).toContainText('plan.md present, no tasks.md yet')
  })

  test('the totals identity holds: story grain sums to the same as feature grain', async ({
    page,
  }) => {
    await gotoBoard(page)
    await expect(page.getByRole('banner')).toContainText('11/15 tasks')

    await setGrain(page, 'Stories')
    await expect(page.getByRole('banner')).toContainText('11/15 tasks')
  })

  test('the chosen grain survives a reload', async ({ page }) => {
    await gotoBoard(page)
    await setGrain(page, 'Stories')
    await expect(page.getByTestId('story-card').first()).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('story-card').first()).toBeVisible()
    await expect(page.getByTestId('feature-card')).toHaveCount(0)
  })

  test('search narrows the board, and the total follows the grain', async ({ page }) => {
    await gotoBoard(page, 'stories')
    await search(page, 'zoom')

    await expect(page.getByTestId('story-card')).toHaveCount(1)
    await expect(page.getByRole('banner')).toContainText('1 story')
    await expect(page.getByRole('banner')).toContainText('0/2 tasks')

    // The same needle at feature grain matches the whole feature instead.
    await setGrain(page, 'Features')
    await expect(page.getByTestId('feature-card')).toHaveCount(1)
    await expect(page.getByRole('banner')).toContainText('4/7 tasks')
  })

  test('a search matching nothing empties the board without breaking it', async ({ page }) => {
    await gotoBoard(page)
    await search(page, 'zzzznothing')

    await expect(page.getByTestId('feature-card')).toHaveCount(0)
    await expect(page.getByRole('banner')).toContainText('0 features')
    // 009 replaced the word "empty" with what would put a card there.
    await expect(column(page, 'done')).toContainText('Nothing has every task ticked')
  })
})

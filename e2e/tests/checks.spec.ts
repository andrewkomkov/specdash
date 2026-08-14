import { expect, test } from '@playwright/test'
import { column, gotoBoard } from './helpers'

test.describe('what the artefacts disagree about', () => {
  test('a feature whose plan fails its own constitution says so on the card', async ({ page }) => {
    await gotoBoard(page)

    const card = column(page, 'plan').getByTestId('feature-card')
    await expect(card).toHaveAttribute('data-feature', 'atlas/002-planned-not-cut')

    const badge = card.getByTestId('finding-badge')
    await expect(badge).toHaveText('1')
  })

  test('a feature with nothing wrong carries no badge at all', async ({ page }) => {
    await gotoBoard(page)

    // An absence is data: a clean feature shows nothing rather than a zero.
    const card = column(page, 'specify').getByTestId('feature-card')
    await expect(card).toHaveAttribute('data-feature', 'atlas/003-just-a-spec')
    await expect(card.getByTestId('finding-badge')).toHaveCount(0)
  })

  test('the checks tab names the finding, the verdict and the declared exception', async ({
    page,
  }) => {
    await gotoBoard(page)
    await column(page, 'plan').getByTestId('feature-card').click()

    await page.getByRole('tab', { name: 'Checks' }).click()

    // The finding, with the file it rests on.
    await expect(page.getByText('plan.md records a failed constitution check')).toBeVisible()
    await expect(page.getByText('constitution-failed')).toBeVisible()

    // The verdict, and the line it was drawn from.
    await expect(
      page.getByText('V. Live — this plan adds a manual refresh step', { exact: true }),
    ).toBeVisible()

    // A declared exception is a record, not a problem — and the template's own
    // example row is not one at all.
    await expect(page.getByText('A manual refresh button')).toBeVisible()
    await expect(page.getByText('4th project')).toHaveCount(0)
  })

  test('a feature whose plan has no constitution section is told apart from an unknown one', async ({
    page,
  }) => {
    await gotoBoard(page)
    await page.locator('[data-feature="atlas/001-map-the-catalogue"]').click()

    await page.getByRole('tab', { name: 'Checks' }).click()

    await expect(page.getByText('plan.md has no constitution section.')).toBeVisible()
  })

  test('the checkboxes in the checks tab do not exist, because nothing here is editable', async ({
    page,
  }) => {
    await gotoBoard(page)
    await column(page, 'plan').getByTestId('feature-card').click()
    await page.getByRole('tab', { name: 'Checks' }).click()

    // Scoped to the drawer: the project chips behind it are checkboxes too, and
    // they are the board's filter rather than anything that edits a project.
    await expect(page.getByRole('dialog').getByRole('checkbox')).toHaveCount(0)
  })
})

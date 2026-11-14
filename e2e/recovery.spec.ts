import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, fixture, toStyleStep } from './helpers'

test('unknown pages show a helpful 404 with a way back', async ({ page }) => {
  await page.goto('/definitely-not-a-page')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/not found|can’t find/i)
  await expectNoHorizontalOverflow(page)
  await page
    .getByRole('link', { name: /home|back/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/$/)
})

test('reloading mid-flow starts cleanly instead of breaking', async ({ page }) => {
  await toStyleStep(page)
  await page.reload()
  // Photos are deliberately kept in memory only, so a reload returns to the first step.
  await expect(page.getByRole('heading', { name: 'Add your photo' })).toBeVisible()
})

test('changing the photo keeps the chosen style', async ({ page }) => {
  await toStyleStep(page)
  await page.getByRole('radio', { name: /editorial/i }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Change photo' }).click()
  await page.getByRole('button', { name: 'Use a different photo' }).click()
  await page.getByLabel('Choose a photo').setInputFiles(fixture('portrait.jpg'))
  await page.getByRole('button', { name: 'Apply crop' }).click()
  await page.getByRole('button', { name: /choose a style/i }).click()
  await expect(page.getByRole('radio', { name: /editorial/i })).toBeChecked()
})

test('generation keeps working if the connection drops after the page loads', async ({
  page,
  context,
}) => {
  await page.goto('/studio')
  await context.setOffline(true)
  await page.getByLabel('Choose a photo').setInputFiles(fixture('portrait.jpg'))
  await page.getByRole('button', { name: 'Apply crop' }).click()
  await page.getByRole('button', { name: /choose a style/i }).click()
  await page.getByRole('button', { name: /^Generate .* preview$/ }).click()
  await expect(page.getByText(/preview ready\./)).toBeAttached()
  await context.setOffline(false)
})

test('a failed generation can be retried, or skipped by framing the plain photo', async ({
  page,
}) => {
  // QA switch: make every mock generation fail.
  await page.goto('/studio?mockFailRate=1')
  await page.getByLabel('Choose a photo').setInputFiles(fixture('portrait.jpg'))
  await page.getByRole('button', { name: 'Apply crop' }).click()
  await page.getByRole('button', { name: /choose a style/i }).click()
  await page.getByRole('button', { name: /^Generate .* preview$/ }).click()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Something went wrong')
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible()

  await page.getByRole('button', { name: 'Continue to frames' }).click()
  await expect(page.getByText(/framing: your photo \(no style\)/i)).toBeVisible()
})

test('a studio chunk that fails to load offers a reload instead of a blank page', async ({
  page,
}) => {
  await page.goto('/')
  // Simulate a redeploy (old chunk gone) or a dropped connection.
  await page.route('**/assets/StudioPage-*.js', (route) => route.fulfill({ status: 404 }))
  await page
    .getByRole('link', { name: /create my avatar/i })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'This page couldn’t load' })).toBeVisible()

  await page.unroute('**/assets/StudioPage-*.js')
  await page.getByRole('button', { name: 'Reload page' }).click()
  await expect(page.getByRole('heading', { name: 'Add your photo' })).toBeVisible()
})

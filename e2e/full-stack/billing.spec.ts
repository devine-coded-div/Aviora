import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { choose, expectNoA11yViolations, fixture, pngSize } from '../helpers'

const API = 'http://localhost:4180'
const RAZORPAY = 'http://127.0.0.1:4280'
const CHECKOUT_JS = 'https://checkout.razorpay.com/v1/checkout.js'
type Outcome = 'captured' | 'authorized' | 'failed' | 'dismiss'

// One shared database and one client IP: the free quota is used up by the first test, so the
// tests run in order.
test.describe.configure({ mode: 'serial' })

/** Serve the stand-in checkout.js instead of Razorpay's (no real payment network). */
async function fakeCheckout(page: Page, outcome: Outcome = 'captured') {
  const script = await (await page.request.get(`${RAZORPAY}/checkout.js`)).text()
  await page.route(CHECKOUT_JS, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: script }),
  )
  await setOutcome(page, outcome)
}

async function setOutcome(page: Page, outcome: Outcome) {
  await page.addInitScript((o) => {
    ;(window as unknown as { e2eRzpOutcome: string }).e2eRzpOutcome = o
  }, outcome)
  await page
    .evaluate((o) => {
      ;(window as unknown as { e2eRzpOutcome: string }).e2eRzpOutcome = o
    }, outcome)
    .catch(() => {}) // no page loaded yet
}

async function toStyleStep(page: Page) {
  await page.goto('/studio')
  await expect(
    page.getByText('Your photo stays on this device until you generate a style.'),
  ).toBeVisible()
  await page.getByLabel('Choose a photo').setInputFiles(fixture('portrait.jpg'))
  await page.getByRole('button', { name: 'Apply crop' }).click()
  await page.getByRole('button', { name: /choose a style/i }).click()
  await expect(page.getByRole('heading', { name: 'Choose a style' })).toBeVisible()
}

const accountToken = (page: Page) =>
  page.evaluate(() => localStorage.getItem('ai-avatar-studio.account'))

async function serverCredits(page: Page) {
  const token = await accountToken(page)
  const res = await page.request.get(`${API}/api/account`, {
    headers: { 'X-Account-Token': token! },
  })
  return ((await res.json()) as { credits: number }).credits
}

async function openPacks(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Get credits' })
  await expect(dialog.getByRole('list', { name: 'Credit packs' })).toBeVisible()
  await expect(dialog.getByRole('note')).toContainText('Test mode')
  return dialog
}

test('free generation, quota, purchase and premium generation through the real API', async ({
  page,
}) => {
  await fakeCheckout(page, 'captured')
  await toStyleStep(page)

  // Honest labelling: the server's provider is the mock, and the photo is uploaded for it.
  await expect(page.getByRole('note')).toContainText('not AI')
  await expect(page.getByRole('note')).toContainText('sent to our server')
  await expect(page.getByText('1 of 1 free left today')).toBeVisible()

  await page.getByRole('button', { name: 'Generate Bold Cartoon preview' }).click()
  await expect(page.getByText('Bold Cartoon preview ready.')).toBeAttached()
  await expect(page.getByText('0 of 1 free left today')).toBeVisible()

  // Free quota used up → the server refuses (402) and the user is offered credits.
  await choose(page.getByRole('radio', { name: /anime classic/i }))
  await page.getByRole('button', { name: 'Generate Anime Classic preview' }).click()
  await expect(page.getByText('Credits needed')).toBeVisible()
  await page.getByRole('alert').getByRole('button', { name: 'Get credits' }).click()

  const dialog = await openPacks(page)
  await expectNoA11yViolations(page)
  await dialog.getByRole('button', { name: 'Buy 10 credits for ₹99' }).click()
  await expect(dialog.getByText('Payment confirmed — 10 credits added')).toBeVisible()
  await expect(dialog.getByText('You now have 10 credits.')).toBeVisible()
  expect(await serverCredits(page)).toBe(10)
  await dialog.getByRole('button', { name: 'Back to my avatar' }).click()
  await expect(dialog).toBeHidden()

  // A premium style now costs one credit.
  await choose(page.getByRole('radio', { name: /comic pop/i }))
  await page.getByRole('button', { name: 'Generate Comic Pop preview' }).click()
  await expect(page.getByText('Comic Pop preview ready.')).toBeAttached()
  await expect.poll(() => serverCredits(page)).toBe(9)

  await page.getByRole('button', { name: 'Continue to frames' }).click()
  await page.getByRole('button', { name: 'Continue to download' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('avatar-comic-pop-neon-1080x1080.png')
  expect(pngSize(await readFile((await download.path())!))).toEqual({ width: 1080, height: 1080 })
})

test('a replayed checkout response never grants credits twice', async ({ page }) => {
  await fakeCheckout(page, 'captured')
  await toStyleStep(page)
  await page.getByRole('button', { name: 'Get credits' }).click()
  const dialog = await openPacks(page)
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/billing/orders') && r.request().method() === 'POST',
  )
  await dialog.getByRole('button', { name: 'Buy 10 credits for ₹99' }).click()
  const orderId = ((await (await created).json()) as { id: string }).id
  await expect(dialog.getByText('You now have 10 credits.')).toBeVisible()

  // Replay the exact signed checkout response, as an attacker or a double submit would.
  const token = (await accountToken(page))!
  const payment = await page.evaluate(
    () => (window as unknown as { e2eRzpLastPayment: Record<string, string> }).e2eRzpLastPayment,
  )
  const body = {
    razorpayOrderId: payment['razorpay_order_id'],
    razorpayPaymentId: payment['razorpay_payment_id'],
    razorpaySignature: payment['razorpay_signature'],
  }
  const headers = { 'X-Account-Token': token }
  for (let i = 0; i < 3; i++) {
    const again = await page.request.post(`${API}/api/billing/orders/${orderId}/verify`, {
      headers,
      data: body,
    })
    expect(((await again.json()) as { outcome: string }).outcome).toBe('paid')
  }

  // The same payment presented for a different order is rejected outright.
  const other = await page.request.post(`${API}/api/billing/orders`, {
    headers,
    data: { packId: 'pro' },
  })
  const otherId = ((await other.json()) as { id: string }).id
  const mismatch = await page.request.post(`${API}/api/billing/orders/${otherId}/verify`, {
    headers,
    data: body,
  })
  expect(mismatch.status()).toBe(400)

  // A forged signature is rejected too.
  const forged = await page.request.post(`${API}/api/billing/orders/${orderId}/verify`, {
    headers,
    data: { ...body, razorpaySignature: '0'.repeat(64) },
  })
  expect(forged.status()).toBe(400)

  expect(await serverCredits(page)).toBe(10)
})

test('a pending payment completes when the signed webhook arrives', async ({ page }) => {
  await fakeCheckout(page, 'authorized')
  await toStyleStep(page)
  await page.getByRole('button', { name: 'Get credits' }).click()
  const dialog = await openPacks(page)
  await dialog.getByRole('button', { name: 'Buy 30 credits for ₹249' }).click()
  await expect(dialog.getByText('Payment processing')).toBeVisible()
  expect(await serverCredits(page)).toBe(0)

  const paymentId = await page.evaluate(
    () =>
      (window as unknown as { e2eRzpLastPayment: Record<string, string> }).e2eRzpLastPayment[
        'razorpay_payment_id'
      ],
  )
  // Razorpay captures it and delivers the webhook (twice, as retries do).
  const capture = await page.request.post(`${RAZORPAY}/__capture`, { data: { paymentId } })
  expect(await capture.json()).toEqual({ first: 200, second: 200 })

  await expect(dialog.getByText('Payment confirmed — 30 credits added')).toBeVisible({
    timeout: 15_000,
  })
  expect(await serverCredits(page)).toBe(30)
})

test('declined and abandoned payments leave the balance untouched', async ({ page }) => {
  await fakeCheckout(page, 'failed')
  await toStyleStep(page)
  await page.getByRole('button', { name: 'Get credits' }).click()
  const dialog = await openPacks(page)

  await dialog.getByRole('button', { name: 'Buy 10 credits for ₹99' }).click()
  await expect(dialog.getByText('Card declined (test)')).toBeVisible()

  await setOutcome(page, 'dismiss')
  await dialog.getByRole('button', { name: 'Try again' }).click()
  await expect(dialog.getByText(/payment cancelled/i)).toBeVisible()
  expect(await serverCredits(page)).toBe(0)
})

test('credits move to another browser with the restore code', async ({ page, browser }) => {
  await fakeCheckout(page, 'captured')
  await toStyleStep(page)
  await page.getByRole('button', { name: 'Get credits' }).click()
  const dialog = await openPacks(page)
  await dialog.getByRole('button', { name: 'Buy 10 credits for ₹99' }).click()
  await expect(dialog.getByText('You now have 10 credits.')).toBeVisible()
  const code = (await accountToken(page))!

  const other = await browser.newPage()
  await toStyleStep(other)
  await other.getByRole('button', { name: 'Get credits' }).click()
  const otherDialog = other.getByRole('dialog', { name: 'Get credits' })
  await otherDialog.getByText('Using another device?').click()
  await otherDialog.getByLabel('Restore credits from another device').fill(code)
  await otherDialog.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(otherDialog.getByText(/restored/i)).toBeVisible()
  // The balance line (the Starter pack is also "10 credits", hence first()).
  await expect(otherDialog.getByText('10 credits', { exact: true }).first()).toBeVisible()
  expect(await serverCredits(other)).toBe(10)
  await other.close()
})

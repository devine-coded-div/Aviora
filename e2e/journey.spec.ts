import { expect, test, type Locator } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  choose,
  expectNoA11yViolations,
  expectNoHorizontalOverflow,
  jpegSize,
  pngSize,
  toStyleStep,
} from './helpers'

test('core journey: photo → crop → style → frame → 1080×1080 download', async ({ page }) => {
  await page.goto('/')
  await expectNoHorizontalOverflow(page)
  await page
    .getByRole('link', { name: /create my avatar/i })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'Add your photo' })).toBeVisible()
  await expect(
    page.getByText('Your photo stays on this device. Nothing is uploaded.'),
  ).toBeVisible()

  await toStyleStep(page)
  // The mock is never presented as AI.
  await expect(page.getByRole('note')).toContainText('not AI')
  await choose(page.getByRole('radio', { name: /anime classic/i }))
  await page.getByRole('button', { name: 'Generate Anime Classic preview' }).click()
  await expect(page.getByText('Anime Classic preview ready.')).toBeAttached()
  await expect(page.getByText('Mock preview · not AI').first()).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Continue to frames' }).click()
  await expect(page.getByRole('heading', { name: 'Frame your avatar' })).toBeVisible()
  await choose(page.getByRole('radio', { name: 'Flame' }))
  await expect(page.getByRole('img', { name: /flame/i })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Continue to download' }).click()
  await expect(page.getByRole('heading', { name: 'Preview and download' })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  const [png] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PNG' }).click(),
  ])
  expect(png.suggestedFilename()).toBe('avatar-anime-classic-flame-1080x1080.png')
  expect(pngSize(await readFile((await png.path())!))).toEqual({ width: 1080, height: 1080 })

  await choose(page.getByRole('radio', { name: /jpeg/i }))
  await page.getByRole('textbox', { name: 'File name' }).fill('My Profile Pic!')
  const [jpg] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download JPEG' }).click(),
  ])
  expect(jpg.suggestedFilename()).toMatch(/^my-profile-pic-1080x1080\.jpe?g$/)
  expect(jpegSize(await readFile((await jpg.path())!))).toEqual({ width: 1080, height: 1080 })
})

test('the exported image matches the editor preview', async ({ page }) => {
  await toStyleStep(page)
  await page.getByRole('button', { name: 'Continue to frames' }).click()
  await choose(page.getByRole('radio', { name: 'Gradient' }))
  await page.getByRole('button', { name: 'Continue to download' }).click()
  await choose(page.getByRole('radio', { name: 'Square' }))

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PNG' }).click(),
  ])
  const exported = (await readFile((await download.path())!)).toString('base64')

  // Scale the export down to the preview canvas and compare pixel by pixel.
  const diff = await page
    .getByRole('region', { name: 'Preview' })
    .locator('canvas')
    .first()
    .evaluate(async (preview: HTMLCanvasElement, data) => {
      const img = new Image()
      img.src = `data:image/png;base64,${data}`
      await img.decode()
      const size = preview.width
      const scratch = document.createElement('canvas')
      scratch.width = scratch.height = size
      const ctx = scratch.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, size, size)
      const a = ctx.getImageData(0, 0, size, size).data
      const b = preview.getContext('2d')!.getImageData(0, 0, size, size).data
      let total = 0
      for (let i = 0; i < a.length; i += 4) {
        total +=
          Math.abs(a[i]! - b[i]!) +
          Math.abs(a[i + 1]! - b[i + 1]!) +
          Math.abs(a[i + 2]! - b[i + 2]!)
      }
      return { size, mean: total / ((a.length / 4) * 3) }
    }, exported)

  expect(diff.size).toBeGreaterThan(100)
  // Mean per-channel difference on a 0–255 scale; only resampling noise is allowed.
  expect(diff.mean).toBeLessThan(2)
})

test('each step of the studio passes axe (WCAG 2.2 AA)', async ({ page }) => {
  await page.goto('/')
  await expectNoA11yViolations(page)
  await toStyleStep(page)
  await expectNoA11yViolations(page)
  await page.getByRole('button', { name: 'Continue to frames' }).click()
  await expectNoA11yViolations(page)
  await page.getByRole('button', { name: 'Continue to download' }).click()
  await expectNoA11yViolations(page)
})

test.describe('smallest phones (320 px)', () => {
  test.use({ viewport: { width: 320, height: 640 } })

  test('no step scrolls sideways and the primary actions stay reachable', async ({ page }) => {
    await page.goto('/')
    await expectNoHorizontalOverflow(page)
    await toStyleStep(page)
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: /^Generate .* preview$/ }).click()
    await expectTouchTarget(page.getByRole('button', { name: 'Show original' }))
    await expectTouchTarget(page.getByRole('button', { name: 'Regenerate' }))
    await page.getByRole('button', { name: 'Continue to frames' }).click()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Continue to download' }).click()
    await expectNoHorizontalOverflow(page)
    await expectTouchTarget(page.getByRole('button', { name: 'Download PNG' }))
  })
})

/** Visible on screen when scrolled to, and at least 44 px tall (comfortable to tap). */
async function expectTouchTarget(button: Locator) {
  await button.scrollIntoViewIfNeeded()
  await expect(button).toBeInViewport()
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
}

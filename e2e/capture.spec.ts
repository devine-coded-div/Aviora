import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, fixture } from './helpers'

test.describe('camera', () => {
  test('takes a selfie with the camera and goes to cropping', async ({ page, context }) => {
    await context.grantPermissions(['camera'])
    await page.goto('/studio')
    await page.getByRole('button', { name: /take a selfie/i }).click()
    await page.getByRole('button', { name: 'Turn on camera' }).click()

    const video = page.getByLabel('Live camera preview')
    await expect(video).toBeVisible()
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth))
      .toBeGreaterThan(0)
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Take photo' }).click()
    // Captured photo is reviewed, then cropped.
    await page.getByRole('button', { name: /use (this )?photo/i }).click()
    await expect(page.getByRole('heading', { name: 'Crop your photo' })).toBeVisible()

    // The camera is released once a photo is taken.
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll('video')].some(
            (v) => (v.srcObject as MediaStream | null)?.active,
          ),
        ),
      )
      .toBe(false)
  })

  test('turns the camera off when leaving the studio mid-capture', async ({ page, context }) => {
    await context.grantPermissions(['camera'])
    await page.goto('/studio')
    // Track every stream the page opens, so we can check they are all stopped.
    await page.evaluate(() => {
      const opened: MediaStream[] = []
      ;(window as unknown as { e2eStreams: MediaStream[] }).e2eStreams = opened
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async (c) => {
        const stream = await original(c)
        opened.push(stream)
        return stream
      }
    })
    await page.getByRole('button', { name: /take a selfie/i }).click()
    await page.getByRole('button', { name: 'Turn on camera' }).click()
    await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled()

    await page
      .getByRole('link', { name: /home|ai avatar studio/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { e2eStreams: MediaStream[] }).e2eStreams.flatMap((s) =>
              s.getTracks().filter((t) => t.readyState === 'live'),
            ).length,
        ),
      )
      .toBe(0)
  })

  test('explains a blocked camera and offers upload instead', async ({ page }) => {
    // No permission granted: headless Chrome denies the prompt.
    await page.goto('/studio')
    await page.getByRole('button', { name: /take a selfie/i }).click()
    await page.getByRole('button', { name: 'Turn on camera' }).click()
    await expect(page.getByText('Camera access is blocked')).toBeVisible()

    await page.getByRole('button', { name: 'Upload a photo' }).click()
    await page.getByLabel('Choose a photo').setInputFiles(fixture('portrait.jpg'))
    await expect(page.getByRole('heading', { name: 'Crop your photo' })).toBeVisible()
  })
})

test.describe('upload validation', () => {
  const cases = [
    { name: 'a text file', file: 'notes.txt', error: 'That file type isn’t supported' },
    { name: 'a tiny image', file: 'tiny.png', error: 'That photo is too small' },
    { name: 'a corrupt JPEG', file: 'broken.jpg', error: 'We couldn’t open that photo' },
  ]
  for (const { name, file, error } of cases) {
    test(`rejects ${name}, then accepts a valid photo`, async ({ page }) => {
      await page.goto('/studio')
      await page.getByLabel('Choose a photo').setInputFiles(fixture(file))
      await expect(page.getByText(error)).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Add your photo' })).toBeVisible()

      await page.getByLabel('Choose a photo').setInputFiles(fixture('portrait.jpg'))
      await expect(page.getByRole('heading', { name: 'Crop your photo' })).toBeVisible()
      await expect(page.getByText(error)).toBeHidden()
    })
  }

  test('rejects files over 25 MB without reading them', async ({ page }) => {
    await page.goto('/studio')
    await page.getByLabel('Choose a photo').setInputFiles({
      name: 'huge.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(26 * 1024 * 1024, 0xff),
    })
    await expect(page.getByText('That photo is too large')).toBeVisible()
  })

  test('never sends the photo over the network', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => {
      if (r.method() !== 'GET' || r.url().startsWith('blob:') || r.url().startsWith('data:')) {
        requests.push(`${r.method()} ${r.url().slice(0, 80)}`)
      }
    })
    await page.goto('/studio')
    await page.getByLabel('Choose a photo').setInputFiles(fixture('portrait.jpg'))
    await page.getByRole('button', { name: 'Apply crop' }).click()
    await page.getByRole('button', { name: /choose a style/i }).click()
    await page.getByRole('button', { name: /^Generate .* preview$/ }).click()
    await expect(page.getByText(/preview ready\./)).toBeAttached()
    expect(requests.filter((r) => !r.includes('blob:') && !r.includes('data:'))).toEqual([])
  })
})

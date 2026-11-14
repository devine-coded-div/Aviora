import { expect, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

export const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name)

/** Open the studio and get to the crop step with a fixture photo. */
export async function uploadPhoto(page: Page, name = 'portrait.jpg') {
  await page.goto('/studio')
  await page.getByLabel('Choose a photo').setInputFiles(fixture(name))
  await expect(page.getByRole('heading', { name: 'Crop your photo' })).toBeVisible()
}

/** Upload, crop and arrive at the style step. */
export async function toStyleStep(page: Page) {
  await uploadPhoto(page)
  await page.getByRole('button', { name: 'Apply crop' }).click()
  await page.getByRole('button', { name: /choose a style/i }).click()
  await expect(page.getByRole('heading', { name: 'Choose a style' })).toBeVisible()
}

/** Page content must never be wider than the viewport (no sideways scrolling on phones). */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth, 'page is wider than the viewport').toBeLessThanOrEqual(innerWidth)
}

const axeSource = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
)

/** Run axe-core (WCAG 2.2 A/AA) in the real browser, where colour contrast can be measured. */
export async function expectNoA11yViolations(page: Page) {
  await page.addScriptTag({ content: axeSource })
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: typeof import('axe-core') }).axe
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    })
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} — ${n.failureSummary ?? ''}`),
    }))
  })
  expect(violations).toEqual([])
}

/** Width and height from a PNG's IHDR chunk. */
export function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** Width and height from a JPEG's SOF marker. */
export function jpegSize(bytes: Buffer) {
  expect(bytes[0]).toBe(0xff)
  expect(bytes[1]).toBe(0xd8)
  let i = 2
  while (i < bytes.length) {
    const marker = bytes[i + 1]!
    const length = bytes.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) }
    }
    i += 2 + length
  }
  throw new Error('No SOF marker')
}

/**
 * Select a radio the way a keyboard user would. Style, frame and format choices are visually
 * hidden native radios inside styled cards, so there is no visible box to click.
 */
export async function choose(radio: Locator) {
  await radio.focus()
  await radio.press('Space')
  await expect(radio).toBeChecked()
}

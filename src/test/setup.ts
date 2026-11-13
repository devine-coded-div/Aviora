import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom does not implement layout/scrolling APIs; stub them so navigation code can run.
Element.prototype.scrollIntoView = vi.fn<Element['scrollIntoView']>()
window.scrollTo = vi.fn<() => void>() as unknown as typeof window.scrollTo
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn<() => void>(),
  removeListener: vi.fn<() => void>(),
  addEventListener: vi.fn<() => void>(),
  removeEventListener: vi.fn<() => void>(),
  dispatchEvent: vi.fn<() => boolean>(),
})) as unknown as typeof window.matchMedia

afterEach(() => {
  cleanup()
})

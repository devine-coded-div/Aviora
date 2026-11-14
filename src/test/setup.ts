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

// jsdom has no canvas or media playback. Stub them quietly; tests that need a canvas spy on
// getContext themselves, and components treat a null context as "can't render yet".
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']
HTMLMediaElement.prototype.play = vi.fn<() => Promise<void>>(() => Promise.resolve())

// jsdom has no object URLs; hand out unique fake ones so revocation can be asserted.
let objectUrlCounter = 0
URL.createObjectURL = vi.fn<(obj: Blob | MediaSource) => string>(
  () => `blob:test/${++objectUrlCounter}`,
)
URL.revokeObjectURL = vi.fn<(url: string) => void>()

afterEach(() => {
  cleanup()
})

// jsdom has no modal dialogs. Minimal stand-in: open/close toggle the attribute and `close`
// fires the close event, which is all our dialogs rely on.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

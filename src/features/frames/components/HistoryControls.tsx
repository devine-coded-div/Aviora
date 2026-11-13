import { Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui'
import { useFrameStore } from '../store'

const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform)

/** Ignore shortcuts while typing in text fields (range/radio/colour inputs are fine). */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
  return (
    target instanceof HTMLInputElement &&
    ['text', 'search', 'email', 'url', 'number'].includes(target.type)
  )
}

/** Undo / redo / reset buttons plus Ctrl/⌘+Z, Shift+Ctrl/⌘+Z and Ctrl+Y. */
export function HistoryControls() {
  const canUndo = useFrameStore((s) => s.past.length > 0)
  const canRedo = useFrameStore((s) => s.future.length > 0)
  const undo = useFrameStore((s) => s.undo)
  const redo = useFrameStore((s) => s.redo)
  const reset = useFrameStore((s) => s.reset)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = isMac() ? event.metaKey : event.ctrlKey
      if (!mod || event.altKey || isTextEntry(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  const shortcut = isMac() ? '⌘' : 'Ctrl+'
  return (
    <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Edit history">
      <Button
        size="sm"
        variant="secondary"
        onClick={undo}
        disabled={!canUndo}
        aria-keyshortcuts={isMac() ? 'Meta+Z' : 'Control+Z'}
        title={`Undo (${shortcut}Z)`}
      >
        <Undo2 aria-hidden="true" />
        Undo
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={redo}
        disabled={!canRedo}
        aria-keyshortcuts={isMac() ? 'Meta+Shift+Z' : 'Control+Shift+Z Control+Y'}
        title={`Redo (${shortcut}Shift+Z)`}
      >
        <Redo2 aria-hidden="true" />
        Redo
      </Button>
      <Button size="sm" variant="ghost" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Reset frame
      </Button>
    </div>
  )
}

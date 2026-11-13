import { useId } from 'react'
import { cn } from '@/lib/cn'
import { FRAME_PRESETS } from '../presets'
import type { SourceImage } from '../render/drawAvatar'
import type { FrameKind } from '../types'
import { FrameCanvas } from './FrameCanvas'

/** Radio group of frame presets, each previewed with the user's own avatar. */
export function FramePresetPicker({
  value,
  source,
  onChange,
}: {
  value: FrameKind
  source: SourceImage | null
  onChange: (kind: FrameKind) => void
}) {
  const name = useId()
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-semibold">Frame</legend>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
        {FRAME_PRESETS.map((preset) => {
          const selected = preset.kind === value
          return (
            <li key={preset.kind}>
              <label
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-1.5 text-center transition-colors',
                  'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent',
                  selected
                    ? 'border-accent bg-accent/10 ring-2 ring-accent/40'
                    : 'border-border hover:border-border-strong',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={preset.kind}
                  checked={selected}
                  onChange={() => onChange(preset.kind)}
                  className="sr-only"
                />
                <FrameCanvas
                  settings={preset.defaults}
                  source={source}
                  renderSize={144}
                  className="rounded-lg"
                />
                <span className="text-[0.7rem] leading-tight font-medium sm:text-xs">
                  {preset.name}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

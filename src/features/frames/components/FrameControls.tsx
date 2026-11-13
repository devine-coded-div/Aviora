import { Pipette } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/cn'
import { formatValue } from '../format'
import type { ColorControl, FrameControl, FrameSettings, RangeControl } from '../types'

export interface FrameControlsProps {
  controls: readonly FrameControl[]
  settings: FrameSettings
  onChange: (patch: Partial<FrameSettings>, key: string) => void
  /** Ends a gesture (slider released), so the next change starts a new undo step. */
  onCommit: () => void
}

/** Renders whatever controls the current preset declares. */
export function FrameControls({ controls, settings, onChange, onCommit }: FrameControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      {controls.map((control) =>
        control.type === 'range' ? (
          <RangeField
            key={control.key}
            control={control}
            value={settings[control.key]}
            onChange={(v) => onChange({ [control.key]: v }, control.key)}
            onCommit={onCommit}
          />
        ) : (
          <ColorField
            key={control.key}
            control={control}
            value={settings[control.key]}
            onChange={(v) => onChange({ [control.key]: v }, control.key)}
            onCommit={onCommit}
          />
        ),
      )}
    </div>
  )
}

function RangeField({
  control,
  value,
  onChange,
  onCommit,
}: {
  control: RangeControl
  value: number
  onChange: (v: number) => void
  onCommit: () => void
}) {
  const id = useId()
  const text = formatValue(control, value)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {control.label}
        </label>
        <output htmlFor={id} className="text-sm text-fg-muted tabular-nums">
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        aria-valuetext={control.format === 'px1080' ? `${text} at 1080 pixels` : text}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        className="h-8 w-full cursor-pointer accent-accent-strong"
      />
    </div>
  )
}

function ColorField({
  control,
  value,
  onChange,
  onCommit,
}: {
  control: ColorControl
  value: string
  onChange: (v: string) => void
  onCommit: () => void
}) {
  const name = useId()
  const customId = useId()
  const isSwatch = control.swatches.some((s) => s.value.toLowerCase() === value.toLowerCase())
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium">{control.label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {control.swatches.map((swatch) => {
          const checked = swatch.value.toLowerCase() === value.toLowerCase()
          return (
            <label
              key={swatch.value}
              title={swatch.name}
              className={cn(
                'relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full border-2 transition',
                'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent',
                checked ? 'border-fg' : 'border-transparent',
              )}
            >
              <input
                type="radio"
                name={name}
                value={swatch.value}
                checked={checked}
                onChange={() => {
                  onChange(swatch.value)
                  onCommit()
                }}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="size-7 rounded-full border border-border-strong"
                style={{ background: swatch.value }}
              />
              <span className="sr-only">{swatch.name}</span>
            </label>
          )
        })}
        <label
          htmlFor={customId}
          className={cn(
            'relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border-strong px-3 text-xs font-medium text-fg-muted hover:text-fg',
            'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent',
            !isSwatch && 'border-fg text-fg',
          )}
        >
          <span
            aria-hidden="true"
            className="size-5 rounded-full border border-white/30"
            style={{ background: value }}
          />
          <Pipette className="size-3.5" aria-hidden="true" />
          Custom
          <input
            id={customId}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onCommit}
            aria-label={`Custom ${control.label.toLowerCase()}`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </fieldset>
  )
}

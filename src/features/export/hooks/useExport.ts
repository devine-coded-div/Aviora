import { useCallback, useMemo, useRef, useState } from 'react'
import type { FrameSettings, SourceImage } from '@/features/frames'
import { downloadBlob, shareBlob } from '../lib/deliver'
import { readImageSize, renderAvatarImage } from '../lib/renderAvatarImage'
import { ExportError, type ExportErrorKind, type ExportedImage, type ExportFormat } from '../types'

export type ExportState =
  | { status: 'idle' }
  | { status: 'rendering' }
  | { status: 'done'; image: ExportedImage; via: 'download' | 'share' }
  | { status: 'error'; kind: ExportErrorKind }

export interface ExportRequest {
  settings: FrameSettings
  source: SourceImage | null
  size: number
  format: ExportFormat
  quality: number
  fileName: string
}

const IDLE: ExportState = { status: 'idle' }

/** Injectable for tests (jsdom can't encode or decode images). */
export const exportDeps = { renderAvatarImage, readImageSize, downloadBlob, shareBlob }

/**
 * Render → verify → deliver. The rendered file is decoded and its real dimensions checked before
 * it's handed to the user. Any change to the request clears a finished state.
 */
export function useExport(request: ExportRequest) {
  const { settings, source, size, format, quality, fileName } = request
  const deps = useMemo(
    () => [settings, source, size, format, quality, fileName] as const,
    [settings, source, size, format, quality, fileName],
  )
  // Each state remembers the request it belongs to; if the request has changed since, the
  // finished file (or error) no longer matches what's on screen, so we show idle instead.
  const [entry, setEntry] = useState<{ deps: readonly unknown[]; state: ExportState }>({
    deps,
    state: IDLE,
  })
  const state = entry.deps === deps ? entry.state : IDLE
  const runId = useRef(0)

  const run = useCallback(
    async (via: 'download' | 'share') => {
      const id = ++runId.current
      const update = (next: ExportState) => {
        if (id === runId.current) setEntry({ deps, state: next })
      }
      update({ status: 'rendering' })
      try {
        const blob = await exportDeps.renderAvatarImage({ settings, source, size, format, quality })
        const actual = await exportDeps.readImageSize(blob).catch((error: unknown) => {
          throw new ExportError('encode-failed', { cause: error })
        })
        if (actual.width !== size || actual.height !== size) throw new ExportError('size-mismatch')
        if (id !== runId.current) return

        if (via === 'share') {
          const shared = await exportDeps.shareBlob(blob, fileName)
          if (!shared) return update(IDLE)
        } else {
          try {
            exportDeps.downloadBlob(blob, fileName)
          } catch (error) {
            throw new ExportError('download-failed', { cause: error })
          }
        }
        update({
          status: 'done',
          via,
          image: { blob, format, width: actual.width, height: actual.height, fileName },
        })
      } catch (error) {
        update({
          status: 'error',
          kind:
            error instanceof ExportError
              ? error.kind
              : via === 'share'
                ? 'download-failed'
                : 'encode-failed',
        })
      }
    },
    [deps, settings, source, size, format, quality, fileName],
  )

  return {
    state,
    download: useCallback(() => run('download'), [run]),
    share: useCallback(() => run('share'), [run]),
  }
}

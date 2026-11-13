import { useCallback, useEffect, useRef, useState } from 'react'
import type { StyleId } from '../catalog'
import { useGenerationProvider } from '../generation/providerContext'
import {
  toGenerationError,
  type GenerationErrorKind,
  type GenerationProgress,
} from '../generation/types'
import { useStyleStore } from '../store'

export type GenerationJob =
  | { status: 'idle' }
  | { status: 'running'; styleId: StyleId; progress: GenerationProgress }
  | {
      status: 'error'
      styleId: StyleId
      kind: GenerationErrorKind
      retryable: boolean
      attempts: number
    }

/**
 * Runs one generation at a time for the given source image. Starting a new one cancels the
 * previous; leaving the step cancels whatever is running.
 */
export function useGeneration(source: { blob: Blob; url: string }) {
  const provider = useGenerationProvider()
  const setResult = useStyleStore((s) => s.setResult)
  const [job, setJob] = useState<GenerationJob>({ status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)
  const attemptsRef = useRef(new Map<StyleId, number>())

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setJob({ status: 'idle' })
  }, [])

  const generate = useCallback(
    async (styleId: StyleId) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const attempts = (attemptsRef.current.get(styleId) ?? 0) + 1
      attemptsRef.current.set(styleId, attempts)

      setJob({ status: 'running', styleId, progress: { stage: 'queued', percent: 0 } })
      try {
        const result = await provider.generate({
          image: source.blob,
          styleId,
          signal: controller.signal,
          onProgress: (progress) => {
            if (!controller.signal.aborted) setJob({ status: 'running', styleId, progress })
          },
        })
        if (controller.signal.aborted) return
        setResult(source.url, styleId, {
          blob: result.image,
          url: URL.createObjectURL(result.image),
          provider: result.provider,
          createdAt: result.createdAt,
        })
        attemptsRef.current.delete(styleId)
        setJob({ status: 'idle' })
      } catch (error) {
        if (controller.signal.aborted) return
        const err = toGenerationError(error)
        if (err.kind === 'cancelled') {
          setJob({ status: 'idle' })
          return
        }
        setJob({ status: 'error', styleId, kind: err.kind, retryable: err.retryable, attempts })
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
      }
    },
    [provider, setResult, source.blob, source.url],
  )

  const dismissError = useCallback(() => setJob({ status: 'idle' }), [])

  // Cancel on unmount. Also return to idle so a remount (e.g. React StrictMode in dev) starts clean.
  useEffect(
    () => () => {
      controllerRef.current?.abort()
      controllerRef.current = null
      setJob({ status: 'idle' })
    },
    [],
  )

  return { job, generate, cancel, dismissError, provider: provider.info }
}

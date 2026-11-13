import { useEffect, useState } from 'react'
import type { SourceImage } from '../render/drawAvatar'

export type SourceImageState =
  { status: 'loading' } | { status: 'ready'; source: SourceImage } | { status: 'error' }

/** Decode an object URL into something the canvas can draw. */
export async function loadSourceImage(url: string): Promise<SourceImage> {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()
  return { image: img, width: img.naturalWidth, height: img.naturalHeight }
}

export function useSourceImage(url: string): SourceImageState {
  const [state, setState] = useState<{ url: string; value: SourceImageState }>({
    url,
    value: { status: 'loading' },
  })
  // Reset synchronously when the URL changes so a stale image is never drawn.
  if (state.url !== url) setState({ url, value: { status: 'loading' } })

  useEffect(() => {
    let cancelled = false
    loadSourceImage(url).then(
      (source) => !cancelled && setState({ url, value: { status: 'ready', source } }),
      () => !cancelled && setState({ url, value: { status: 'error' } }),
    )
    return () => {
      cancelled = true
    }
  }, [url])

  return state.value
}

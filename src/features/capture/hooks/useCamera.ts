import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CameraError,
  countCameras,
  facingOf,
  openCamera,
  stopStream,
  toCameraError,
} from '../lib/camera'
import { captureVideoFrame } from '../lib/image'
import type { CameraErrorKind, FacingMode } from '../types'

export type CameraState =
  | { status: 'idle' }
  | { status: 'starting'; facingMode: FacingMode }
  | { status: 'active'; facingMode: FacingMode; canSwitch: boolean }
  | { status: 'error'; kind: CameraErrorKind }

/**
 * Owns the camera MediaStream: start (user-initiated only), switch, capture and guaranteed cleanup.
 * The stream is attached to `videoRef` whenever the camera is active.
 */
export function useCamera() {
  const [state, setState] = useState<CameraState>({ status: 'idle' })
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  // Guards against a slow getUserMedia resolving after the user has moved on.
  const requestIdRef = useRef(0)

  const release = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const attach = useCallback((stream: MediaStream) => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    // play() can reject if interrupted by a new load; the next attach will retry.
    void video.play()?.catch(() => {})
  }, [])

  const start = useCallback(
    async (facingMode: FacingMode = 'user') => {
      const requestId = ++requestIdRef.current
      release()
      setState({ status: 'starting', facingMode })
      try {
        const stream = await openCamera(facingMode)
        if (requestId !== requestIdRef.current) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        const cameras = await countCameras()
        if (requestId !== requestIdRef.current) return
        setState({
          status: 'active',
          facingMode: facingOf(stream, facingMode),
          canSwitch: cameras > 1,
        })
      } catch (error) {
        if (requestId !== requestIdRef.current) return
        setState({ status: 'error', kind: toCameraError(error).kind })
      }
    },
    [release],
  )

  const stop = useCallback(() => {
    requestIdRef.current++
    release()
    setState({ status: 'idle' })
  }, [release])

  const switchCamera = useCallback(() => {
    if (state.status !== 'active') return
    void start(state.facingMode === 'user' ? 'environment' : 'user')
  }, [start, state])

  const capture = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current
    if (state.status !== 'active' || !video) throw new CameraError('unknown')
    return captureVideoFrame(video, state.facingMode === 'user')
  }, [state])

  // Attach the stream once the <video> for the active state has rendered.
  useEffect(() => {
    if (state.status === 'active' && streamRef.current) attach(streamRef.current)
  }, [state, attach])

  // Always turn the camera off when the component using it goes away.
  useEffect(() => {
    return () => {
      // requestIdRef is a plain counter (not a DOM ref); bumping it cancels in-flight starts.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestIdRef.current++
      release()
    }
  }, [release])

  return { state, videoRef, start, stop, switchCamera, capture }
}

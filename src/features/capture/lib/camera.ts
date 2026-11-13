import type { CameraErrorKind, FacingMode } from '../types'

export class CameraError extends Error {
  readonly kind: CameraErrorKind
  constructor(kind: CameraErrorKind, cause?: unknown) {
    super(kind, { cause })
    this.name = 'CameraError'
    this.kind = kind
  }
}

/** Why the camera can't be used at all, or null if getUserMedia is available. */
export function getCameraBlocker(): CameraErrorKind | null {
  if (typeof window !== 'undefined' && window.isSecureContext === false) return 'insecure-context'
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia)
    return 'unsupported'
  return null
}

/** `name` of an Error/DOMException-like value. OverconstrainedError isn't an Error subclass everywhere. */
function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return typeof error.name === 'string' ? error.name : ''
  }
  return ''
}

/** Map DOMException names from getUserMedia to our error kinds. */
export function toCameraError(error: unknown): CameraError {
  if (error instanceof CameraError) return error
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new CameraError('permission-denied', error)
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new CameraError('not-found', error)
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new CameraError('in-use', error)
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return new CameraError('overconstrained', error)
    case 'TypeError':
      return new CameraError('unsupported', error)
    default:
      return new CameraError('unknown', error)
  }
}

/** Ask for a camera stream. Only call in response to a user action. */
export async function openCamera(facingMode: FacingMode): Promise<MediaStream> {
  const blocker = getCameraBlocker()
  if (blocker) throw new CameraError(blocker)

  const video: MediaTrackConstraints = {
    facingMode: { ideal: facingMode },
    width: { ideal: 1920 },
    height: { ideal: 1920 },
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false })
  } catch (error) {
    // Some devices reject resolution hints; retry with the bare minimum before giving up.
    if (errorName(error) === 'OverconstrainedError') {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      } catch (retryError) {
        throw toCameraError(retryError)
      }
    }
    throw toCameraError(error)
  }
}

/** Number of video inputs. Device labels/ids are only meaningful after permission is granted. */
export async function countCameras(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((d) => d.kind === 'videoinput').length
  } catch {
    return 0
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop())
}

/** Which way the active track is facing; falls back to what we asked for. */
export function facingOf(stream: MediaStream, requested: FacingMode): FacingMode {
  const setting = stream.getVideoTracks()[0]?.getSettings().facingMode
  return setting === 'user' || setting === 'environment' ? setting : requested
}

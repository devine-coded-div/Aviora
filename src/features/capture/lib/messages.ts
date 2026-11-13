import { MAX_FILE_BYTES, MIN_SIDE_PX } from '../constants'
import type { CameraErrorKind, PhotoErrorKind } from '../types'

export interface Message {
  title: string
  description: string
}

const maxMb = Math.round(MAX_FILE_BYTES / 1024 / 1024)

export const PHOTO_ERROR_MESSAGES: Record<PhotoErrorKind, Message> = {
  empty: {
    title: 'That file is empty',
    description: 'Choose a different photo.',
  },
  'unsupported-type': {
    title: 'That file type isn’t supported',
    description: 'Use a JPG, PNG or WebP photo.',
  },
  'heic-unsupported': {
    title: 'This browser can’t open HEIC photos',
    description:
      'Export the photo as JPG first, or open this page in Safari. On iPhone, choosing from Photos usually converts it automatically.',
  },
  'too-large': {
    title: 'That photo is too large',
    description: `Choose a photo under ${maxMb} MB.`,
  },
  'too-small': {
    title: 'That photo is too small',
    description: `Use a photo at least ${MIN_SIDE_PX} × ${MIN_SIDE_PX} pixels so your avatar stays sharp.`,
  },
  'too-many-pixels': {
    title: 'That photo’s resolution is too high',
    description: 'Choose a photo under 50 megapixels, or resize it first.',
  },
  'decode-failed': {
    title: 'We couldn’t open that photo',
    description: 'The file may be damaged or not really an image. Try a different one.',
  },
}

export const CAMERA_ERROR_MESSAGES: Record<CameraErrorKind, Message> = {
  'permission-denied': {
    title: 'Camera access is blocked',
    description:
      'Allow camera access for this site in your browser settings (usually the camera or lock icon in the address bar), then try again. Or upload a photo instead.',
  },
  'not-found': {
    title: 'No camera found',
    description: 'We couldn’t find a camera on this device. Upload a photo instead.',
  },
  'in-use': {
    title: 'Your camera is busy',
    description: 'Another app or tab may be using it. Close it and try again.',
  },
  overconstrained: {
    title: 'That camera isn’t available',
    description: 'Try again, or upload a photo instead.',
  },
  'insecure-context': {
    title: 'Camera needs a secure connection',
    description: 'Open this page over https to use the camera, or upload a photo instead.',
  },
  unsupported: {
    title: 'This browser can’t use the camera here',
    description: 'You can still take a photo with your device’s camera app, or upload one.',
  },
  unknown: {
    title: 'The camera didn’t start',
    description: 'Something went wrong while starting the camera. Try again or upload a photo.',
  },
}

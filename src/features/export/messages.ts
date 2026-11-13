import type { NoticeMessage } from '@/components/ui'
import type { ExportErrorKind } from './types'

export const EXPORT_ERROR_MESSAGES: Record<ExportErrorKind, NoticeMessage> = {
  'source-missing': {
    title: 'Your avatar isn’t loaded yet',
    description: 'Wait a moment for the preview to appear, then try again.',
  },
  'canvas-unavailable': {
    title: 'This browser can’t create images',
    description: 'Try again in an up-to-date version of Chrome, Safari, Edge or Firefox.',
  },
  'encode-failed': {
    title: 'Couldn’t create the image',
    description: 'Your device may be low on memory. Close other tabs and try again, or try JPEG.',
  },
  'size-mismatch': {
    title: 'The image came out the wrong size',
    description: 'Please try again. If it keeps happening, try a different browser.',
  },
  'download-failed': {
    title: 'Couldn’t save the file',
    description: 'Check that downloads are allowed for this site, then try again.',
  },
}

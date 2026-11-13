import { ACCEPTED_MIME_TYPES, HEIC_MIME_TYPES, MAX_FILE_BYTES } from '../constants'
import type { PhotoErrorKind } from '../types'

export type FileCheck = { ok: true; isHeic: boolean } | { ok: false; error: PhotoErrorKind }

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

/** Some platforms (notably older Android and Windows for HEIC) report an empty MIME type. */
export function resolveMimeType(file: Pick<File, 'type' | 'name'>): string {
  if (file.type) return file.type.toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[ext] ?? ''
}

/** Cheap checks done before decoding: presence, type and byte size. */
export function validateImageFile(file: Pick<File, 'type' | 'name' | 'size'>): FileCheck {
  if (file.size === 0) return { ok: false, error: 'empty' }

  const type = resolveMimeType(file)
  const isHeic = (HEIC_MIME_TYPES as readonly string[]).includes(type)
  const isAccepted = (ACCEPTED_MIME_TYPES as readonly string[]).includes(type)
  if (!isAccepted && !isHeic) return { ok: false, error: 'unsupported-type' }

  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'too-large' }

  return { ok: true, isHeic }
}

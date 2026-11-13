import type { ExportFormat } from '../types'
import { FORMAT_INFO } from '../types'

export const MAX_BASE_LENGTH = 60
const FALLBACK_BASE = 'avatar'

/** Lowercase ASCII words joined by dashes; safe on every OS and in URLs. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Default base name from what the user made, e.g. "avatar-anime-classic-neon". */
export function defaultBaseName(parts: {
  style?: string | undefined
  frame?: string | undefined
}): string {
  return [
    FALLBACK_BASE,
    parts.style,
    parts.frame && parts.frame !== 'No frame' ? parts.frame : undefined,
  ]
    .filter(Boolean)
    .map((p) => slugify(p!))
    .filter(Boolean)
    .join('-')
}

/** Clean a user-typed base name. Empty or unusable input falls back to "avatar". */
export function sanitizeBaseName(input: string): string {
  const slug = slugify(input).slice(0, MAX_BASE_LENGTH).replace(/-+$/g, '')
  return slug || FALLBACK_BASE
}

/** Final file name: "<base>-<w>x<h>.<ext>". */
export function buildFileName(base: string, format: ExportFormat, size: number): string {
  return `${sanitizeBaseName(base)}-${size}x${size}.${FORMAT_INFO[format].ext}`
}

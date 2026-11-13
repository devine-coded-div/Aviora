import type { PhotoSource, SourcePhoto } from '../types'
import { checkDimensions, decodeImage, PhotoError } from './image'
import { validateImageFile } from './validateImageFile'

/**
 * Validate, decode and wrap a user photo in an object URL. Everything stays in memory —
 * nothing is sent anywhere. Throws `PhotoError` with a user-facing kind on failure.
 */
export async function preparePhoto(
  file: Blob & { name?: string },
  source: PhotoSource,
): Promise<SourcePhoto> {
  const name = file.name ?? `selfie-${Date.now()}.jpg`
  const check = validateImageFile({ name, size: file.size, type: file.type })
  if (!check.ok) throw new PhotoError(check.error)

  const url = URL.createObjectURL(file)
  try {
    const img = await decodeImage(url).catch((error: unknown) => {
      // A HEIC file that fails to decode means this browser can't read HEIC (Safari can).
      if (check.isHeic) throw new PhotoError('heic-unsupported')
      throw error
    })
    const problem = checkDimensions(img.naturalWidth, img.naturalHeight)
    if (problem) throw new PhotoError(problem)

    return { blob: file, url, width: img.naturalWidth, height: img.naturalHeight, source, name }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error instanceof PhotoError ? error : new PhotoError('decode-failed')
  }
}

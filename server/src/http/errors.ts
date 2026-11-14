import type { ErrorRequestHandler, RequestHandler } from 'express'
import multer from 'multer'
import { UploadError, type UploadErrorCode } from '../uploads/validateImage.ts'

/** An error that is safe to show to API clients. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const UPLOAD_STATUS: Record<UploadErrorCode, number> = {
  'missing-image': 400,
  'file-too-large': 413,
  'unsupported-type': 415,
  'image-too-small': 422,
  'image-too-large': 422,
  'animated-image': 422,
  'corrupt-image': 422,
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not-found', message: 'Not found.' } })
}

/** Converts every error into `{ error: { code, message } }`. Internals are logged, never sent. */
export function errorHandler(log: Pick<Console, 'error'> = console): ErrorRequestHandler {
  return (error, _req, res, _next) => {
    const requestId = res.locals['requestId'] as string | undefined
    let status = 500
    let code = 'internal'
    let message = 'Something went wrong. Try again.'

    if (error instanceof ApiError) {
      ;({ status, code, message } = error)
    } else if (error instanceof UploadError) {
      status = UPLOAD_STATUS[error.code]
      code = error.code
      message = error.message
    } else if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        status = 413
        code = 'file-too-large'
        message = 'The image file is too large.'
      } else {
        status = 400
        code = 'invalid-upload'
        message = 'Send one image in the "image" field.'
      }
    } else if (
      error &&
      typeof error === 'object' &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      status = 413
      code = 'payload-too-large'
      message = 'Request too large.'
    } else {
      log.error('Unhandled API error', { requestId, error: errorDetail(error) })
    }
    // Unexpected errors carry the request id so a user's report can be matched to the logs
    // (every response also has it in X-Request-Id).
    res.status(status).json({
      error: { code, message, ...(status === 500 && requestId ? { requestId } : {}) },
    })
  }
}

function errorDetail(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error
}

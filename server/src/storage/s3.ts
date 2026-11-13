import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import type { ObjectStorage } from './types.ts'

export interface S3StorageOptions {
  bucket: string
  region: string
  endpoint?: string | undefined
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
  /** Prepended to every key so the bucket can be shared safely. */
  keyPrefix: string
}

/**
 * S3-compatible private storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO…).
 * Objects are written with no ACL (bucket default, which must be private) and server-side
 * encryption requested; they are only ever read back through the API.
 */
export class S3Storage implements ObjectStorage {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly prefix: string

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket
    this.prefix = options.keyPrefix
    this.client = new S3Client({
      region: options.region,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      forcePathStyle: options.forcePathStyle,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
      // Only send checksums when the operation requires them (wider S3-compatible support).
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }

  private key(key: string) {
    return `${this.prefix}${key}`
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(key),
        Body: body,
        ContentType: contentType,
        CacheControl: 'private, no-store',
      }),
    )
  }

  async get(key: string) {
    try {
      const out = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.key(key) }),
      )
      if (!out.Body) return null
      const bytes = await out.Body.transformToByteArray()
      return {
        body: Buffer.from(bytes),
        contentType: out.ContentType ?? 'application/octet-stream',
      }
    } catch (error) {
      if (error instanceof NoSuchKey) return null
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) return null
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(key) }))
  }

  destroy() {
    this.client.destroy()
  }
}

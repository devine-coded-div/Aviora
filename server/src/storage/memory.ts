import type { ObjectStorage } from './types.ts'

/** In-process storage for development and tests only (rejected in production by config). */
export class MemoryStorage implements ObjectStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>()

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body: Buffer.from(body), contentType })
  }

  async get(key: string) {
    return this.objects.get(key) ?? null
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key)
  }
}

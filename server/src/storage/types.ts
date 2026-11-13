/** Private object storage. Objects are never publicly readable; the API streams them. */
export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>
  /** Returns null if the object doesn't exist. */
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>
  /** Idempotent: deleting a missing object is not an error. */
  delete(key: string): Promise<void>
}

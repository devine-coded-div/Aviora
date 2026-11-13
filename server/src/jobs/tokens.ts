import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** Unguessable access token returned once to the client that created a job. */
export function newToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function tokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Keyed hash of the client IP: lets us rate-limit without storing addresses. */
export function hashClient(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 32)
}

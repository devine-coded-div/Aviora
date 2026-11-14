/**
 * The anonymous account token lives in localStorage. It is also the user's "restore code":
 * entering it on another device moves their credits there. Storage can be unavailable (private
 * mode, blocked cookies), so every access is guarded.
 */
const KEY = 'ai-avatar-studio.account'

export function readAccountToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function writeAccountToken(token: string): void {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    // Not persisted; the account lasts for this tab only.
  }
}

export function clearAccountToken(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export const isPlausibleToken = (value: string) => /^[A-Za-z0-9_-]{40,100}$/.test(value.trim())

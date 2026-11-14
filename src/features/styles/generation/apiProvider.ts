import {
  GenerationError,
  type AvatarGenerationProvider,
  type GenerationErrorKind,
  type GenerationRequest,
  type ProviderInfo,
} from './types'

/**
 * Client for the AI Avatar Studio API (server/). Implements the same interface as the mock, so it
 * can be passed to GenerationProviderScope once the API is hosted. It never holds any secret:
 * each job is authorized only by the one-time token the API returns for it.
 */

type Fetch = typeof fetch

interface ServerJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error: { code: string; message: string; retryable: boolean } | null
  result: { url: string; mime: string } | null
  pollAfterMs: number | null
  token?: string
}

interface ServerProviderInfo {
  id: string
  name: string
  kind: 'mock' | 'ai'
}

/** Read what the server is running. A server-side mock must still be labelled as a mock. */
export async function fetchProviderInfo(
  baseUrl: string,
  fetchImpl: Fetch = fetch,
): Promise<ProviderInfo> {
  const res = await fetchImpl(`${baseUrl}/api/provider`)
  if (!res.ok) throw new GenerationError('network', `Provider info failed (${res.status})`)
  const body = (await res.json()) as ServerProviderInfo
  return { id: `api:${body.id}`, name: body.name, kind: body.kind, runsOnDevice: false }
}

/** Server job error codes → the UI's error kinds. */
export function mapServerError(code: string): GenerationErrorKind {
  switch (code) {
    case 'timeout':
      return 'timeout'
    case 'rate-limited':
    case 'too-many-active-jobs':
    case 'budget-exceeded':
      return 'rate-limited'
    case 'unavailable':
      return 'network'
    case 'payment-required':
      return 'payment-required'
    case 'invalid-input':
    case 'content-rejected':
    case 'input-missing':
    case 'missing-image':
    case 'unsupported-type':
    case 'image-too-small':
    case 'image-too-large':
    case 'animated-image':
    case 'corrupt-image':
    case 'file-too-large':
    case 'unknown-style':
    case 'style-unavailable':
      return 'invalid-input'
    default:
      return 'provider-error'
  }
}

export interface ApiProviderOptions {
  baseUrl: string
  info: ProviderInfo
  fetch?: Fetch
  /** Typical server time, used only to make the progress bar move smoothly. */
  expectedMs?: number
  now?: () => number
  /** Extra headers for creating jobs (the account token). Read at call time. */
  headers?: () => Record<string, string>
}

export function createApiProvider({
  baseUrl,
  info,
  fetch: fetchImpl = fetch,
  expectedMs = 15_000,
  now = Date.now,
  headers = () => ({}),
}: ApiProviderOptions): AvatarGenerationProvider {
  async function call(
    path: string,
    init: RequestInit & { token?: string } = {},
  ): Promise<Response> {
    const { token, ...rest } = init
    try {
      return await fetchImpl(`${baseUrl}${path}`, {
        ...rest,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...rest.headers },
      })
    } catch (error) {
      if (init.signal?.aborted) throw new GenerationError('cancelled')
      throw new GenerationError('network', 'Network request failed', { cause: error })
    }
  }

  async function failFrom(res: Response): Promise<never> {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
    const code = body?.error?.code ?? (res.status === 429 ? 'rate-limited' : 'internal')
    throw new GenerationError(mapServerError(code), code)
  }

  function wait(ms: number, signal: AbortSignal | undefined) {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new GenerationError('cancelled'))
      const t = setTimeout(resolve, ms)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(t)
          reject(new GenerationError('cancelled'))
        },
        { once: true },
      )
    })
  }

  return {
    info,

    async generate({ image, styleId, signal, onProgress }: GenerationRequest) {
      // Only pass `signal` when there is one (exactOptionalPropertyTypes).
      const abortable = signal ? { signal } : {}
      onProgress?.({ stage: 'queued', percent: 2 })
      const form = new FormData()
      form.append('styleId', styleId)
      form.append('image', image, 'avatar.jpg')
      const created = await call('/api/generations', {
        method: 'POST',
        body: form,
        headers: headers(),
        ...abortable,
      })
      if (!created.ok) await failFrom(created)
      const job = (await created.json()) as ServerJob
      const token = job.token!
      const started = now()

      // Best-effort removal of the server copy (on cancel, and once we have the result).
      const remove = () =>
        void call(`/api/generations/${job.id}`, { method: 'DELETE', token, keepalive: true }).catch(
          () => {},
        )

      try {
        let current = job
        while (current.status === 'pending' || current.status === 'processing') {
          const elapsed = now() - started
          onProgress?.(
            current.status === 'pending'
              ? { stage: 'queued', percent: 8 }
              : {
                  stage: 'processing',
                  percent: Math.min(90, 15 + Math.round((elapsed / expectedMs) * 75)),
                },
          )
          await wait(current.pollAfterMs ?? 1000, signal)
          const res = await call(`/api/generations/${job.id}`, { token, ...abortable })
          if (!res.ok) await failFrom(res)
          current = (await res.json()) as ServerJob
        }

        if (current.status === 'failed' || !current.result) {
          throw new GenerationError(
            mapServerError(current.error?.code ?? 'provider-error'),
            current.error?.message,
          )
        }

        onProgress?.({ stage: 'finalizing', percent: 95 })
        const res = await call(current.result.url, { token, ...abortable })
        if (!res.ok) await failFrom(res)
        const blob = await res.blob()
        remove()
        onProgress?.({ stage: 'finalizing', percent: 100 })
        return { image: blob, styleId, provider: info, createdAt: now() }
      } catch (error) {
        if (signal?.aborted) {
          remove()
          throw new GenerationError('cancelled')
        }
        throw error
      }
    },
  }
}

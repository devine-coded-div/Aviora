import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Minimal Razorpay client for the two calls we need, following Razorpay's documented REST API:
 * POST /v1/orders and GET /v1/payments/:id, with HTTP Basic auth (key id : key secret).
 * The key secret never leaves the server.
 */

export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  status: string
}

/** Payment statuses: created, authorized, captured, refunded, failed. */
export interface RazorpayPayment {
  id: string
  order_id: string | null
  amount: number
  currency: string
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
  error_code?: string | null
  error_description?: string | null
}

export interface PaymentGateway {
  createOrder(input: {
    amount: number
    currency: string
    receipt: string
    notes: Record<string, string>
  }): Promise<RazorpayOrder>
  fetchPayment(paymentId: string): Promise<RazorpayPayment>
}

export class GatewayError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GatewayError'
    this.status = status
  }
}

export class RazorpayClient implements PaymentGateway {
  private readonly auth: string
  private readonly base: string
  private readonly fetchImpl: typeof fetch

  constructor(opts: { keyId: string; keySecret: string; apiBase: string; fetch?: typeof fetch }) {
    this.auth = `Basic ${Buffer.from(`${opts.keyId}:${opts.keySecret}`).toString('base64')}`
    this.base = opts.apiBase
    this.fetchImpl = opts.fetch ?? fetch
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await this.fetchImpl(`${this.base}${path}`, {
        method,
        headers: { Authorization: this.auth, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10_000),
      })
    } catch (error) {
      throw new GatewayError('Razorpay unreachable', null, { cause: error })
    }
    if (!res.ok) {
      // Never log or rethrow the response verbatim: it may echo request details.
      throw new GatewayError(`Razorpay ${method} ${path.split('/')[2]} failed`, res.status)
    }
    return (await res.json()) as T
  }

  createOrder(input: {
    amount: number
    currency: string
    receipt: string
    notes: Record<string, string>
  }) {
    return this.request<RazorpayOrder>('POST', '/v1/orders', input)
  }

  fetchPayment(paymentId: string) {
    return this.request<RazorpayPayment>('GET', `/v1/payments/${encodeURIComponent(paymentId)}`)
  }
}

function hmacHex(secret: string, message: string | Buffer): string {
  return createHmac('sha256', secret).update(message).digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8')
  const y = Buffer.from(b, 'utf8')
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Checkout callback signature: HMAC-SHA256(order_id + "|" + payment_id) with the key secret. */
export function paymentSignature(orderId: string, paymentId: string, keySecret: string): string {
  return hmacHex(keySecret, `${orderId}|${paymentId}`)
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  return safeEqualHex(paymentSignature(orderId, paymentId, keySecret), signature)
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function webhookSignature(rawBody: Buffer | string, webhookSecret: string): string {
  return hmacHex(webhookSecret, rawBody)
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  webhookSecret: string,
): boolean {
  return safeEqualHex(webhookSignature(rawBody, webhookSecret), signature)
}

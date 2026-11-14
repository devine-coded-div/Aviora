import { createHash, randomUUID } from 'node:crypto'
import type { Config } from '../config.ts'
import {
  LedgerReason,
  OrderStatus,
  type Account,
  type Db,
  type PaymentOrder,
  type Tx,
} from '../db.ts'
import { ApiError } from '../http/errors.ts'
import { CURRENCY, findPack, PACKS } from './packs.ts'
import {
  GatewayError,
  verifyPaymentSignature,
  verifyWebhookSignature,
  type PaymentGateway,
  type RazorpayPayment,
} from './razorpay.ts'

const STATUS = {
  [OrderStatus.CREATED]: 'created',
  [OrderStatus.PAID]: 'paid',
  [OrderStatus.FAILED]: 'failed',
  [OrderStatus.EXPIRED]: 'expired',
} as const

export type VerifyOutcome = 'paid' | 'pending' | 'failed'

interface WebhookBody {
  event?: string
  payload?: {
    payment?: { entity?: Partial<RazorpayPayment> }
    order?: { entity?: { id?: string } }
  }
}

/**
 * Credit pack purchases through Razorpay.
 *
 * Credits are granted only by `fulfill`, which runs when the server has confirmed with Razorpay
 * that the payment is captured and matches the order — either from the checkout callback
 * (signature verified + payment fetched from Razorpay) or from a signed webhook. Both paths are
 * idempotent: the order flips to PAID once, and the ledger key `purchase:<razorpay order id>` is
 * unique, so duplicate callbacks, webhook retries or races can never grant credits twice.
 */
export class PaymentService {
  private readonly db: Db
  private readonly gateway: PaymentGateway | null
  private readonly config: Config
  private readonly now: () => Date
  private readonly log: Pick<Console, 'info' | 'warn' | 'error'>

  constructor(deps: {
    db: Db
    gateway: PaymentGateway | null
    config: Config
    now?: () => Date
    log?: Pick<Console, 'info' | 'warn' | 'error'>
  }) {
    this.db = deps.db
    this.gateway = deps.gateway
    this.config = deps.config
    this.now = deps.now ?? (() => new Date())
    this.log = deps.log ?? console
  }

  packs() {
    const payments = this.config.payments
    return {
      paymentsEnabled: payments !== null,
      testMode: payments?.testMode ?? true,
      keyId: payments?.keyId ?? null,
      currency: CURRENCY,
      packs: PACKS.map((p) => ({
        id: p.id,
        name: p.name,
        credits: p.credits,
        amount: p.amount,
        currency: CURRENCY,
      })),
    }
  }

  view(order: PaymentOrder) {
    return {
      id: order.id,
      packId: order.packId,
      credits: order.credits,
      amount: order.amount,
      currency: order.currency,
      status: STATUS[order.status],
      failureReason: order.failureReason,
      razorpayOrderId: order.razorpayOrderId,
      keyId: this.config.payments?.keyId ?? null,
      paidAt: order.paidAt?.toISOString() ?? null,
    }
  }

  private requireGateway(): PaymentGateway {
    if (!this.gateway || !this.config.payments) {
      throw new ApiError(503, 'payments-disabled', 'Purchases aren’t available right now.')
    }
    return this.gateway
  }

  async createOrder(account: Account, packId: unknown) {
    const gateway = this.requireGateway()
    const pack = findPack(packId)
    if (!pack) throw new ApiError(422, 'unknown-pack', 'Choose one of the available packs.')

    const id = randomUUID()
    let rzp
    try {
      rzp = await gateway.createOrder({
        amount: pack.amount,
        currency: CURRENCY,
        receipt: id,
        notes: { orderId: id, accountId: account.id, packId: pack.id },
      })
    } catch (error) {
      this.log.error(
        'Razorpay order creation failed',
        error instanceof GatewayError ? error.message : error,
      )
      throw new ApiError(502, 'payment-provider-error', 'Couldn’t start the payment. Try again.')
    }
    if (rzp.amount !== pack.amount || rzp.currency !== CURRENCY) {
      throw new ApiError(502, 'payment-provider-error', 'Couldn’t start the payment. Try again.')
    }
    const order = await this.db.paymentOrder.create({
      data: {
        id,
        accountId: account.id,
        packId: pack.id,
        credits: pack.credits,
        amount: pack.amount,
        currency: CURRENCY,
        razorpayOrderId: rzp.id,
        // Same clock as expiry, so the expiry window is measured consistently.
        createdAt: this.now(),
      },
    })
    return this.view(order)
  }

  async getOrder(account: Account, id: string): Promise<PaymentOrder> {
    const order = UUID.test(id) ? await this.db.paymentOrder.findUnique({ where: { id } }) : null
    if (!order || order.accountId !== account.id)
      throw new ApiError(404, 'not-found', 'Order not found.')
    return order
  }

  /**
   * Checkout success callback. The signature proves Razorpay produced this payment for this
   * order; we then fetch the payment from Razorpay and grant credits only if it's captured for
   * the right amount. Authorized-but-not-captured payments are reported as pending (the webhook
   * finishes them).
   */
  async verify(
    account: Account,
    id: string,
    body: { razorpayOrderId?: unknown; razorpayPaymentId?: unknown; razorpaySignature?: unknown },
  ): Promise<{ outcome: VerifyOutcome; order: ReturnType<PaymentService['view']> }> {
    const gateway = this.requireGateway()
    const order = await this.getOrder(account, id)
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body
    if (
      typeof razorpayOrderId !== 'string' ||
      typeof razorpayPaymentId !== 'string' ||
      typeof razorpaySignature !== 'string' ||
      razorpayOrderId !== order.razorpayOrderId ||
      !verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        this.config.payments!.keySecret,
      )
    ) {
      throw new ApiError(400, 'invalid-signature', 'The payment couldn’t be verified.')
    }
    if (order.status === OrderStatus.PAID) return { outcome: 'paid', order: this.view(order) }

    let payment: RazorpayPayment
    try {
      payment = await gateway.fetchPayment(razorpayPaymentId)
    } catch (error) {
      this.log.warn(
        'Payment lookup failed; leaving order pending',
        error instanceof GatewayError ? error.message : error,
      )
      return { outcome: 'pending', order: this.view(order) }
    }
    const outcome = await this.applyPayment(order, payment)
    const fresh = await this.db.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    return { outcome, order: this.view(fresh) }
  }

  /** Reconcile one Razorpay payment with its order. */
  private async applyPayment(
    order: PaymentOrder,
    payment: RazorpayPayment,
    tx?: Tx,
  ): Promise<VerifyOutcome> {
    if (payment.order_id !== order.razorpayOrderId) {
      this.log.error(`Payment ${payment.id} does not belong to order ${order.id}`)
      return 'failed'
    }
    switch (payment.status) {
      case 'captured':
        if (payment.amount !== order.amount || payment.currency !== order.currency) {
          this.log.error(`Amount mismatch on order ${order.id}: needs manual review`)
          await (tx ?? this.db).paymentOrder.updateMany({
            where: { id: order.id, status: { not: OrderStatus.PAID } },
            data: { status: OrderStatus.FAILED, failureReason: 'amount-mismatch' },
          })
          return 'failed'
        }
        if (tx) await this.fulfill(tx, order, payment.id)
        else await this.db.$transaction((t) => this.fulfill(t, order, payment.id))
        return 'paid'
      case 'created':
      case 'authorized':
        return 'pending'
      case 'failed':
      case 'refunded':
        // A failed attempt doesn't close the order: Razorpay lets the user retry the same order.
        await (tx ?? this.db).paymentOrder.updateMany({
          where: { id: order.id, status: { not: OrderStatus.PAID } },
          data: { failureReason: payment.error_description ?? payment.status },
        })
        return 'failed'
    }
  }

  /** Mark the order paid and grant its credits — exactly once. */
  private async fulfill(tx: Tx, order: PaymentOrder, paymentId: string): Promise<boolean> {
    const { count } = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: { not: OrderStatus.PAID } },
      data: {
        status: OrderStatus.PAID,
        razorpayPaymentId: paymentId,
        paidAt: this.now(),
        failureReason: null,
      },
    })
    if (count === 0) return false
    const account = await tx.account.update({
      where: { id: order.accountId },
      data: { credits: { increment: order.credits } },
    })
    await tx.creditLedger.create({
      data: {
        id: randomUUID(),
        accountId: order.accountId,
        delta: order.credits,
        reason: LedgerReason.PURCHASE,
        idempotencyKey: `purchase:${order.razorpayOrderId}`,
        orderId: order.id,
        balanceAfter: account.credits,
      },
    })
    this.log.info(`Order ${order.id} paid: +${order.credits} credits`)
    return true
  }

  /**
   * Razorpay webhook. Verified against the raw body; each event id is processed once (the
   * de-duplication record is written in the same transaction as the effect, so a crash makes
   * Razorpay retry rather than losing the event).
   */
  async handleWebhook(rawBody: Buffer, signature: string | undefined, eventId: string | undefined) {
    const payments = this.config.payments
    if (!payments) throw new ApiError(503, 'payments-disabled', 'Payments are not configured.')
    if (!signature || !verifyWebhookSignature(rawBody, signature, payments.webhookSecret)) {
      throw new ApiError(400, 'invalid-signature', 'Invalid webhook signature.')
    }
    let body: WebhookBody
    try {
      body = JSON.parse(rawBody.toString('utf8')) as WebhookBody
    } catch {
      throw new ApiError(400, 'invalid-payload', 'Invalid webhook payload.')
    }
    const id = eventId || createHash('sha256').update(rawBody).digest('hex')
    const event = body.event ?? 'unknown'

    return this.db.$transaction(async (tx) => {
      const { count } = await tx.webhookEvent.createMany({
        data: [{ id, event }],
        skipDuplicates: true,
      })
      if (count === 0) return { status: 'duplicate' as const }

      const payment = body.payload?.payment?.entity
      const orderId = payment?.order_id ?? body.payload?.order?.entity?.id
      if (!payment?.id || !orderId) return { status: 'ignored' as const }
      const order = await tx.paymentOrder.findUnique({ where: { razorpayOrderId: orderId } })
      if (!order) {
        this.log.warn(`Webhook ${event} for unknown order ${orderId}`)
        return { status: 'ignored' as const }
      }

      if (event === 'payment.captured' || event === 'order.paid') {
        // order.paid can arrive before the payment entity says "captured"; it means paid.
        const status = event === 'order.paid' ? 'captured' : payment.status
        await this.applyPayment(
          order,
          { ...(payment as RazorpayPayment), order_id: orderId, status: status ?? 'captured' },
          tx,
        )
      } else if (event === 'payment.failed') {
        await this.applyPayment(
          order,
          { ...(payment as RazorpayPayment), order_id: orderId, status: 'failed' },
          tx,
        )
      }
      return { status: 'processed' as const }
    })
  }

  /** Unpaid orders past their window become EXPIRED (a late payment is still honoured). */
  async expireStale(): Promise<number> {
    const cutoff = new Date(this.now().getTime() - this.config.ORDER_EXPIRY_MINUTES * 60_000)
    const { count } = await this.db.paymentOrder.updateMany({
      where: { status: OrderStatus.CREATED, createdAt: { lt: cutoff } },
      data: { status: OrderStatus.EXPIRED },
    })
    return count
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

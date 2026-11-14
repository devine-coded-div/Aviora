// Full-stack e2e environment: a fresh Postgres database, a fake Razorpay (REST API, signed
// webhooks and a stand-in checkout.js) and the real API server, all on localhost.
// Run by Playwright (see playwright.fullstack.config.ts). Never point this at real services.
import { spawn } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const serverDir = path.join(root, 'server')
const { Client } = createRequire(path.join(serverDir, 'package.json'))('pg')

export const PORTS = { api: 4180, razorpay: 4280, web: 4174 }
const KEY_ID = 'rzp_test_e2e00000000000'
const KEY_SECRET = 'e2e-key-secret-not-real'
const WEBHOOK_SECRET = 'e2e-webhook-secret-not-real'
const ADMIN_URL =
  process.env.E2E_DATABASE_ADMIN_URL ?? 'postgresql://postgres@localhost:5433/postgres?host=/tmp'
const DB = 'avatar_studio_e2e'

// --- Database ---------------------------------------------------------------------------------
const admin = new Client({ connectionString: ADMIN_URL })
await admin.connect()
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`)
await admin.query(`CREATE DATABASE ${DB}`)
await admin.end()
const dbUrl = new URL(ADMIN_URL)
dbUrl.pathname = `/${DB}`
const db = new Client({ connectionString: dbUrl.toString() })
await db.connect()
const migrations = path.join(serverDir, 'prisma', 'migrations')
for (const name of readdirSync(migrations)
  .filter((n) => /^\d+_/.test(n))
  .sort()) {
  await db.query(readFileSync(path.join(migrations, name, 'migration.sql'), 'utf8'))
}
await db.end()

// --- Fake Razorpay ----------------------------------------------------------------------------
const orders = new Map()
const payments = new Map()
const hmac = (secret, message) => createHmac('sha256', secret).update(message).digest('hex')

const CHECKOUT_JS = `
window.Razorpay = function (options) {
  var onFailed = null
  return {
    on: function (event, cb) { if (event === 'payment.failed') onFailed = cb },
    open: function () {
      var outcome = window.e2eRzpOutcome || 'captured'
      if (outcome === 'dismiss') { setTimeout(options.modal.ondismiss, 50); return }
      fetch('http://127.0.0.1:${PORTS.razorpay}/__pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: options.order_id, outcome: outcome }),
      })
        .then(function (r) { return r.json() })
        .then(function (res) {
          window.e2eRzpLastPayment = res
          if (outcome === 'failed') {
            if (onFailed) onFailed({ error: { description: 'Card declined (test)' } })
            options.modal.ondismiss()
          } else options.handler(res)
        })
    },
  }
}`

async function readJson(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body ? JSON.parse(body) : {}
}

async function sendWebhook(event, payment) {
  const body = JSON.stringify({ event, payload: { payment: { entity: payment } } })
  return fetch(`http://127.0.0.1:${PORTS.api}/api/billing/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, body),
      'X-Razorpay-Event-Id': `evt_${randomUUID()}`,
    },
    body,
  })
}

const razorpay = createServer(async (req, res) => {
  const send = (status, body, type = 'application/json') => {
    res.writeHead(status, {
      'Content-Type': type,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  }
  const url = new URL(req.url, 'http://x')
  if (req.method === 'OPTIONS') return send(204, '')
  if (url.pathname === '/checkout.js') return send(200, CHECKOUT_JS, 'application/javascript')

  // REST API used by our server (Basic auth with the key id and secret).
  if (url.pathname.startsWith('/v1/')) {
    const expected = `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`
    if (req.headers.authorization !== expected)
      return send(401, { error: { code: 'BAD_REQUEST_ERROR' } })
    if (req.method === 'POST' && url.pathname === '/v1/orders') {
      const input = await readJson(req)
      const order = {
        id: `order_${randomUUID().slice(0, 14)}`,
        amount: input.amount,
        currency: input.currency,
        status: 'created',
      }
      orders.set(order.id, order)
      return send(200, order)
    }
    const m = url.pathname.match(/^\/v1\/payments\/([\w-]+)$/)
    if (req.method === 'GET' && m && payments.has(m[1])) return send(200, payments.get(m[1]))
    return send(404, { error: { code: 'BAD_REQUEST_ERROR', description: 'not found' } })
  }

  // What checkout.js would do: create a payment and return the signed handler response.
  if (req.method === 'POST' && url.pathname === '/__pay') {
    const { orderId, outcome } = await readJson(req)
    const order = orders.get(orderId)
    if (!order) return send(404, { error: 'unknown order' })
    const payment = {
      id: `pay_${randomUUID().slice(0, 14)}`,
      order_id: orderId,
      amount: order.amount,
      currency: order.currency,
      status: outcome === 'failed' ? 'failed' : outcome, // captured | authorized | failed
    }
    payments.set(payment.id, payment)
    return send(200, {
      razorpay_order_id: orderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: hmac(KEY_SECRET, `${orderId}|${payment.id}`),
    })
  }

  // Test hook: capture an authorized payment and deliver the signed webhook, twice (Razorpay
  // retries deliveries), to prove credits are granted exactly once.
  if (req.method === 'POST' && url.pathname === '/__capture') {
    const { paymentId } = await readJson(req)
    const payment = payments.get(paymentId)
    if (!payment) return send(404, { error: 'unknown payment' })
    payment.status = 'captured'
    const first = await sendWebhook('payment.captured', payment)
    const second = await sendWebhook('payment.captured', payment)
    return send(200, { first: first.status, second: second.status })
  }
  return send(404, { error: 'not found' })
})
await new Promise((resolve) => razorpay.listen(PORTS.razorpay, '127.0.0.1', resolve))

// --- API server -------------------------------------------------------------------------------
const api = spawn(
  process.execPath,
  ['--experimental-strip-types', '--no-warnings', 'src/server.ts'],
  {
    cwd: serverDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(PORTS.api),
      DATABASE_URL: dbUrl.toString(),
      CORS_ORIGINS: `http://localhost:${PORTS.web}`,
      STORAGE_DRIVER: 'memory',
      AI_PROVIDER: 'mock',
      MOCK_DELAY_MS: '300',
      FREE_GENERATIONS_PER_DAY: '1',
      RAZORPAY_KEY_ID: KEY_ID,
      RAZORPAY_KEY_SECRET: KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
      RAZORPAY_API_BASE: `http://127.0.0.1:${PORTS.razorpay}`,
      LOG_REQUESTS: 'false',
    },
  },
)
const stop = () => {
  api.kill('SIGTERM')
  razorpay.close()
  process.exit(0)
}
api.on('exit', (code) => {
  console.error(`API server exited (${code})`)
  process.exit(code ?? 1)
})
process.on('SIGTERM', stop)
process.on('SIGINT', stop)

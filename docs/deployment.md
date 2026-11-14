# Deployment guide

AI Avatar Studio has two deployable parts:

| Part         | What it is                                                   | Where it can run                                             |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Frontend** | Static files from `npm run build` (`dist/`)                  | GitHub Pages (current), Cloudflare Pages, Netlify, S3 + CDN… |
| **API**      | Node 22 server in `server/` (container: `server/Dockerfile`) | Any container host: Render, Railway, Fly.io, Cloud Run, ECS… |

The API needs **PostgreSQL 14+**, a **private S3-compatible bucket** and (for purchases) a
**Razorpay** account. Without the API, the frontend runs in on-device mock mode.

> The API is not deployed yet. GitHub Pages only serves the frontend. Everything below the
> frontend section is a runbook for when you pick hosts.

---

## 1. Frontend

CI (`.github/workflows/deploy.yml`) builds and deploys on every push to `main` after the
frontend checks, the API integration tests and the Playwright suites pass.

| Variable            | Where                                                     | Notes                                                                      |
| ------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | GitHub → Settings → Secrets and variables → **Variables** | Public. Empty = mock mode. Set it only once the API is live and reachable. |
| `BASE_PATH`         | Set by CI to `/<repo>/`                                   | Use `/` on a custom domain or root-hosted site.                            |

- **SPA routing**: CI copies `index.html` to `404.html` so deep links (`/studio`) work on Pages.
  Other hosts need a "rewrite all to `/index.html`" rule.
- **Caching**: files in `assets/` are content-hashed — cache them for a year. Never cache
  `index.html` for long. After a deploy, open tabs that try to load a removed chunk see
  "This page couldn’t load" with a **Reload** button (tested).
- **Security headers**: GitHub Pages can't set headers. On a host that can, add:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' https://checkout.razorpay.com;
    connect-src 'self' <API origin> https://*.razorpay.com; frame-src https://api.razorpay.com
    https://checkout.razorpay.com; img-src 'self' blob: data: https://*.razorpay.com;
    style-src 'self' 'unsafe-inline'; font-src 'self'; media-src 'self' blob:; object-src 'none';
    base-uri 'self'; frame-ancestors 'none'
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
  X-Content-Type-Options: nosniff
  ```
  Verify the Razorpay entries against a real sandbox checkout before enforcing (start with
  `Content-Security-Policy-Report-Only`).
- **Camera**: `getUserMedia` needs HTTPS (or localhost). All suggested hosts serve HTTPS.

## 2. Database

1. Create a PostgreSQL 14+ database (Neon, Supabase, RDS, Cloud SQL…). Use TLS
   (`?sslmode=require`) and a user that owns only this database.
2. Apply migrations **before** starting a new API version:
   ```bash
   cd server
   DATABASE_URL=postgres://… npx prisma migrate deploy
   # or with the image: docker run --rm -e DATABASE_URL=… avatar-studio-migrate
   ```
   Migrations so far are additive, so the previous API version keeps working during a rollout.
3. Enable automated backups / point-in-time recovery. The `CreditLedger`, `PaymentOrder` and
   `WebhookEvent` tables are the financial record — they must be backed up.

## 3. Object storage

1. Create a bucket (AWS S3, Cloudflare R2, Backblaze B2…). **Block all public access.** Images
   are only ever served through the API.
2. Add a lifecycle rule that deletes objects under `S3_KEY_PREFIX` after **2 days** — a backstop
   for the API's own cleanup (inputs are deleted after processing, results after
   `RESULT_TTL_HOURS`).
3. Create an access key limited to that bucket (`GetObject`, `PutObject`, `DeleteObject`,
   `ListBucket`).

## 4. API server

Build and run the container (or `npm ci && npx prisma generate && npm run build && npm start`):

```bash
cd server
docker build -t avatar-studio-api .
docker build --target migrate -t avatar-studio-migrate .
```

CI builds both images, runs the migration image and checks `/api/health` on every push.

### Production environment

Every variable is documented in `server/.env.example`. The server **refuses to start** in
production if a required value is missing or unsafe (no hashing secret, memory storage,
non-https CORS origins, live Razorpay keys without `PAYMENTS_ALLOW_LIVE=true`, half-configured
AI provider).

```bash
NODE_ENV=production
PORT=8787
TRUST_PROXY=1                       # number of proxies in front (load balancer = 1)
DATABASE_URL=postgres://…?sslmode=require
CORS_ORIGINS=https://devine-coded-div.github.io   # exact frontend origin(s), https only
CLIENT_HASH_SECRET=<openssl rand -hex 32>

STORAGE_DRIVER=s3
S3_ENDPOINT=…                       # empty for AWS
S3_REGION=…
S3_BUCKET=…
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…

AI_PROVIDER=mock                    # until a real provider is contracted (server/README.md)

RAZORPAY_KEY_ID=rzp_test_…          # test keys until launch
RAZORPAY_KEY_SECRET=…
RAZORPAY_WEBHOOK_SECRET=<random, also entered in the Razorpay dashboard>
PAYMENTS_ALLOW_LIVE=false

LOG_FORMAT=json
```

Keep secrets in the host's secret store, never in the repository or the frontend.

### Scaling notes

- Run **one instance** for now: rate limits (`express-rate-limit`) are in memory per process, so
  N instances allow N× the limits. Job processing and credit charging are already safe across
  instances (row locks / `SKIP LOCKED` / advisory locks); move rate limits to a shared store
  (Redis or Postgres) before scaling out.
- The in-process worker runs inside the API process (`WORKER_CONCURRENCY`).
- Graceful shutdown on `SIGTERM` stops the worker and drains connections; set the host's stop
  timeout ≥ 30 s.

## 5. Payments (Razorpay)

1. Use **test mode** keys (`rzp_test_…`) and make at least one sandbox purchase end-to-end:
   success, a declined card, closing checkout, and a UPI payment that stays pending.
2. Dashboard → Webhooks → add `https://<api-host>/api/billing/webhook`, events
   `payment.captured`, `payment.failed`, `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.
3. Going live (only after the release checklist): KYC done, live keys,
   `PAYMENTS_ALLOW_LIVE=true`, live webhook with its own secret, refund/terms/pricing pages
   published, GST handling decided.

## 6. Observability

- **Logs**: JSON lines (`LOG_FORMAT=json`): one `request` line per request with `requestId`,
  `method`, route **pattern** (no ids or query strings), `status` and `ms`. Tokens, headers,
  signatures and images are never logged. Unexpected errors are logged with their `requestId`,
  which is also returned to the client (`X-Request-Id` header, and in 500 bodies) so a user
  report can be traced.
- **Health**: `GET /api/health` (checks the database) — use it for the load balancer and an
  uptime monitor.
- **Alerts worth setting up** (from logs): 5xx rate; `Razorpay order creation failed` /
  `Payment lookup failed`; 400s on `/api/billing/webhook` (bad signatures = misconfiguration or
  probing); `worker tick failed`; `cleanup failed`; daily budget exhaustion (`budget-exceeded`).
- **Business checks** (SQL, daily): sum of `CreditLedger.delta` per account equals
  `Account.credits`; `PaymentOrder` rows stuck in `CREATED` with a captured payment in the
  Razorpay dashboard.

## 7. Rollback

- Frontend: re-run the workflow for the previous commit (Actions → CI & deploy → Re-run), or
  revert and push.
- API: redeploy the previous image tag. Migrations are additive; if one ever isn't, ship the
  code that tolerates both schemas first.

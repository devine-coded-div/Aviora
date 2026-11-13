# AI Avatar Studio — API server

Express 5 + TypeScript API for avatar generation: upload validation, private object storage,
a PostgreSQL-backed job queue (Prisma), a server-side AI provider adapter, rate limiting and
automatic cleanup. One process: the HTTP API and the job worker run together.

> **No real AI provider is connected.** The default `mock` provider applies simple image filters
> and reports `kind: "mock"` so clients label results as "not AI".

## Run locally

```bash
cd server
npm install
cp .env.example .env            # edit DATABASE_URL etc.
npx prisma generate
npx prisma migrate deploy       # creates the GenerationJob table
npm run dev                     # http://localhost:8787
```

Requires Node 22+ and PostgreSQL 14+. `STORAGE_DRIVER=memory` works for local development; use
any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO) otherwise. **The bucket must
be private** — objects are only ever served through the API.

## API

| Method & path                     | Auth         | Purpose                                                        |
| --------------------------------- | ------------ | -------------------------------------------------------------- |
| `GET /api/health`                 | —            | Database reachability                                          |
| `GET /api/provider`               | —            | Provider id, name, `kind` (`mock`/`ai`), styles, privacy terms |
| `POST /api/generations`           | —            | Multipart `image` + `styleId` → `202` job + one-time `token`   |
| `GET /api/generations/:id`        | Bearer token | Status: `pending`, `processing`, `completed`, `failed`         |
| `GET /api/generations/:id/result` | Bearer token | The generated image (`Cache-Control: private, no-store`)       |
| `POST /api/generations/:id/retry` | Bearer token | Retry a failed, retryable job (limited)                        |
| `DELETE /api/generations/:id`     | Bearer token | Delete the job and all its images                              |

Errors are always `{ "error": { "code", "message" } }`. Unknown jobs and wrong tokens both return
`404 not-found`. Status responses include `pollAfterMs` while the job is running.

## How it works

- **Uploads** — max `MAX_UPLOAD_BYTES`; the file is decoded with sharp (name and declared type are
  ignored), must be JPEG/PNG/WebP, 256–4096 px per side, not animated; pixel count is capped
  before decoding. It's re-encoded as a 1024×1024 PNG, which drops all metadata (EXIF, GPS).
- **Jobs** — `PENDING → PROCESSING → COMPLETED | FAILED`. Workers claim jobs with
  `FOR UPDATE SKIP LOCKED`, so multiple instances can share the database. Retryable provider
  errors go back to `PENDING` with exponential backoff (`JOB_RETRY_BASE_MS × 2^(attempt−1)`) until
  `JOB_MAX_ATTEMPTS`; then `FAILED`. Users can retry a failed job `JOB_MAX_MANUAL_RETRIES` times
  while its input still exists. Jobs stuck in `PROCESSING` past `JOB_PROCESSING_TIMEOUT_MS` are
  recovered.
- **Cleanup** — the input is deleted as soon as a result exists; failed jobs keep their input for
  `FAILED_INPUT_TTL_MINUTES` (for retry); results and rows are deleted after `RESULT_TTL_HOURS`;
  abandoned jobs after a day. Deleting a job mid-processing discards its result.
- **Abuse limits** — per-client requests per minute, generations per hour, and active jobs;
  IPv6 clients are grouped by /56. IPs are stored only as an HMAC (`CLIENT_HASH_SECRET`).
- **Access** — each job has a random 256-bit token returned once; only its SHA-256 is stored.
- **Secrets** — database URL, storage keys and provider key exist only in server environment
  variables. `/api/provider` exposes no keys (tested).

## Enabling a real AI provider

The server refuses to start with `AI_PROVIDER` set to anything but `mock` until **all** of these are
configured from the provider's contract and terms:

| Variable                         | Meaning                                            |
| -------------------------------- | -------------------------------------------------- |
| `AI_PROVIDER_API_KEY`            | Credential (server only)                           |
| `AI_PROVIDER_STYLES`             | Style ids the provider supports                    |
| `AI_PROVIDER_COST_PER_IMAGE_USD` | Used to enforce the daily budget                   |
| `AI_PROVIDER_RETENTION_DAYS`     | How long the provider keeps uploads (must be ≤ 30) |
| `AI_PROVIDER_TRAINS_ON_INPUTS`   | Must be `false`                                    |
| `AI_DAILY_BUDGET_USD`            | Hard cap on reserved spend per rolling 24 h        |

Then add an adapter in `src/providers/registry.ts` implementing `AvatarProvider`
(`src/providers/types.ts`): map style ids to the vendor's models/prompts, honour the `AbortSignal`,
and translate vendor errors into `ProviderError` kinds (`timeout`, `rate-limited`, `unavailable`,
`invalid-input`, `content-rejected`, `provider-error`) so retries behave correctly. Update the
landing page privacy copy if the provider's terms differ.

## Tests

`npm test` runs integration tests with supertest against a **real PostgreSQL** (a fresh
`avatar_studio_test` database, migrations applied) and an **S3 API emulator** (s3rver). Set
`TEST_DATABASE_ADMIN_URL` to point at your Postgres (default: local socket on port 5433). CI runs
the same tests against a Postgres 16 service container, applies migrations with
`prisma migrate deploy`, and fails if the migrations drift from `schema.prisma`.

`npm audit --omit=dev` is clean; `s3rver` (test-only, localhost) pulls in an outdated XML parser.

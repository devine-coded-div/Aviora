# Release checklist

Copy this list into the release issue/PR and tick every item. "Verified" means someone did it
for this release, not that it worked last time.

## Automated (CI must be green on the release commit)

- [ ] Frontend: typecheck, lint, format, unit/component tests, build
- [ ] API: typecheck, lint, format, integration tests (Postgres + S3 emulator), build
- [ ] Migrations apply with `prisma migrate deploy` and match `schema.prisma` (drift check)
- [ ] API container image builds and passes its health check
- [ ] Playwright, desktop + mobile: core journey, camera, upload validation, export fidelity,
      layout at 320 px, axe (WCAG 2.2 AA), failure recovery
- [ ] Playwright full stack: real API + Postgres + fake Razorpay (purchase, replay, pending
      webhook, decline/cancel, restore)
- [ ] `npm audit --omit=dev` in both packages: no high/critical issues

## Manual — every release

- [ ] Real phones: iOS Safari and Android Chrome — camera permission prompt, front/back switch,
      capture, crop by touch, download/share of PNG and JPEG
- [ ] Desktop: Chrome, Firefox, Safari — upload, drag-and-drop, keyboard-only run through the
      whole studio, screen reader spot check (VoiceOver or NVDA) on style + export steps
- [ ] Exported image opened in a real app (e.g. set as a profile picture): circle crop keeps the
      face and frame inside the safe area
- [ ] Deep link `/studio` loads on the deployed site; unknown URL shows the 404 page
- [ ] Mock labelling: anything produced by the mock says "not AI" everywhere it appears

## Manual — before enabling the API in production

- [ ] Production env set; server starts without config errors; `/api/health` OK through the
      load balancer
- [ ] `CORS_ORIGINS` is exactly the frontend origin; `TRUST_PROXY` matches the proxy count
- [ ] Bucket is private (anonymous GET on an object fails) and has the 2-day lifecycle rule
- [ ] Logs arrive in JSON; a forced 500 shows a `requestId` that matches the log line
- [ ] Database backups / PITR enabled and a restore tested once
- [ ] Single API instance, or rate limits moved to a shared store
- [ ] Privacy policy and FAQ match actual behaviour (uploads, retention, no training, accounts)

## Manual — before taking real payments

- [ ] Sandbox purchase in the deployed environment: card success, card decline, checkout closed,
      UPI pending → webhook → credits appear
- [ ] Webhook configured with the right URL, events and secret; a test delivery returns 200
- [ ] Same payment cannot be credited twice (re-deliver the webhook from the dashboard)
- [ ] Prices in `server/src/billing/packs.ts` approved; GST/invoicing handled; refund policy,
      terms and contact page published
- [ ] Live keys only in the production secret store; `PAYMENTS_ALLOW_LIVE=true` only there
- [ ] Someone owns payment alerts and the daily ledger reconciliation query

## Manual — before switching on a real AI provider

- [ ] Contract/terms reviewed: retention period, no training on inputs, data location
- [ ] `AI_PROVIDER_*` variables set from the contract; `AI_DAILY_BUDGET_USD` set
- [ ] Output quality checked across skin tones, ages, glasses, low light
- [ ] All "not AI / preview" wording updated only for the styles the provider really generates

## After release

- [ ] Smoke test on production (journey + one free generation if the API is on)
- [ ] Watch error rate and payment alerts for 24 h
- [ ] Tag the release commit

# AI Avatar Studio

A profile picture studio: capture or upload a photo, turn it into a stylized avatar, frame it, and
export a 1080×1080 image for Instagram and other social platforms.

> Status: **Phase 6 (API server with job pipeline; no real AI provider connected yet — styles use a labelled mock)**. Live: https://devine-coded-div.github.io/Aviora/ · See [docs/phases.md](docs/phases.md).

## Requirements

- Node.js 22+ (`.nvmrc`)
- npm 10+

## Getting started

```bash
npm install
cp .env.example .env.local   # optional until Phase 6
npm run dev                  # http://localhost:5173
```

## Scripts

| Script                       | What it does                                                         |
| ---------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                | Start the Vite dev server                                            |
| `npm run build`              | Type-check and build for production into `dist/`                     |
| `npm run preview`            | Serve the production build locally                                   |
| `npm run typecheck`          | Run `tsc -b` across app, test and config projects                    |
| `npm run lint`               | Lint with oxlint (warnings fail)                                     |
| `npm run format`             | Format with Prettier (sorts Tailwind classes)                        |
| `npm run format:check`       | Verify formatting                                                    |
| `npm test`                   | Run unit/component tests once (Vitest)                               |
| `npm run test:watch`         | Run tests in watch mode                                              |
| `npm run check`              | Everything above in sequence — run before committing                 |
| `npm run test:e2e`           | Playwright, desktop + mobile, against a production build (mock mode) |
| `npm run test:e2e:fullstack` | Playwright against the real API, Postgres and a local fake Razorpay  |

End-to-end tests need a browser: `npx playwright install chromium` once (or set
`PW_CHROME_PATH` to an installed Chrome). The full-stack suite also needs PostgreSQL
(`E2E_DATABASE_ADMIN_URL`, e.g. `postgresql://postgres:postgres@localhost:5432/postgres`) and
the server's dependencies (`cd server && npm ci && npx prisma generate`). It creates and drops a
database called `avatar_studio_e2e`.

## Stack

React 19 · TypeScript 7 · Vite 8 · Tailwind CSS 4 · React Router 8 · Zustand · TanStack Query ·
react-easy-crop · Canvas API · Lucide · Inter (self-hosted) · Vitest 5 · Testing Library ·
axe-core · Playwright · oxlint · Prettier. API: Express 5 · Prisma 7 · PostgreSQL · S3 · sharp ·
Razorpay.

## Deployment

Every push to `main` runs the full check (typecheck, lint, format, tests, build), the API
integration tests, a container build and the Playwright suites in GitHub Actions and, if all
pass, deploys to GitHub Pages at `https://<owner>.github.io/<repo>/`. Pull requests
run the checks only. See `.github/workflows/deploy.yml`.

The build reads `BASE_PATH` (set automatically in CI) so assets and routes work under the
`/<repo>/` subpath; `404.html` is a copy of `index.html` so deep links like `/studio` load.

## API server

The backend lives in [`server/`](server/README.md) (Express + Prisma + PostgreSQL + S3-compatible
storage). It isn't deployed yet — see the [deployment guide](docs/deployment.md).

## Docs

- [Phase log](docs/phases.md)
- [Architecture](docs/architecture.md)
- [Deployment guide](docs/deployment.md)
- [Release checklist](docs/release-checklist.md)

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

| Script                 | What it does                                         |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server                            |
| `npm run build`        | Type-check and build for production into `dist/`     |
| `npm run preview`      | Serve the production build locally                   |
| `npm run typecheck`    | Run `tsc -b` across app, test and config projects    |
| `npm run lint`         | Lint with oxlint (warnings fail)                     |
| `npm run format`       | Format with Prettier (sorts Tailwind classes)        |
| `npm run format:check` | Verify formatting                                    |
| `npm test`             | Run unit/component tests once (Vitest)               |
| `npm run test:watch`   | Run tests in watch mode                              |
| `npm run check`        | Everything above in sequence — run before committing |

## Stack (current phase)

React 19 · TypeScript 7 · Vite 8 · Tailwind CSS 4 · React Router 8 · Lucide · Inter (self-hosted) ·
Vitest 5 · Testing Library · axe-core · oxlint · Prettier

Further libraries (Zustand, TanStack Query, react-easy-crop, Motion, Playwright, backend) are added
in the phase that needs them.

## Deployment

Every push to `main` runs the full check (typecheck, lint, format, tests, build) in GitHub Actions
and, if it passes, deploys to GitHub Pages at `https://<owner>.github.io/<repo>/`. Pull requests
run the checks only. See `.github/workflows/deploy.yml`.

The build reads `BASE_PATH` (set automatically in CI) so assets and routes work under the
`/<repo>/` subpath; `404.html` is a copy of `index.html` so deep links like `/studio` load.

## API server

The backend lives in [`server/`](server/README.md) (Express + Prisma + PostgreSQL + S3-compatible
storage). It isn't deployed yet.

## Docs

- [Phase log](docs/phases.md)
- [Architecture](docs/architecture.md)

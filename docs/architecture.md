# Architecture

## Repository layout

```
ai-avatar-studio/
├─ src/                    Frontend (React + Vite)
│  ├─ app/                 App shell: router, route table, layouts, error boundary, providers
│  ├─ pages/               Route-level screens. Thin: compose features, no business logic
│  ├─ features/            Feature modules (one folder per feature, added by phase)
│  ├─ components/ui/       Shared, presentation-only UI primitives
│  ├─ lib/                 Framework-agnostic helpers and constants
│  ├─ config/              Typed runtime/env configuration
│  ├─ styles/              Tailwind entry point and design tokens
│  └─ test/                Test setup and helpers
├─ docs/                   Phase log and architecture notes
└─ server/                 Express + Prisma backend (introduced in Phase 6)
```

The backend will be a sibling package in `server/` with its own `package.json`. No monorepo tool
is planned unless shared code makes one necessary.

## Feature modules

Each feature owns its UI, logic, and state:

```
src/features/<feature>/
├─ components/   Presentational components for this feature
├─ hooks/        React hooks that connect logic to components
├─ lib/          Pure logic (image math, canvas helpers) — unit-tested without React
├─ store.ts      Zustand slice, only if state is shared across components
├─ types.ts
└─ index.ts      Public API; other code imports only from here
```

Current features:

- `landing` — marketing page: content, SVG avatar illustrations, sections.
- `capture` — camera/upload, validation, cropping. Exposes `CaptureFlow` and `usePhotoStore`
  (original photo, crop settings, 1080×1080 cropped JPEG) for later editor steps.

Planned features: `styles` (avatar style selection and
generation), `frames` (rings, gradients, effects), `export` (preview and 1080×1080 rendering).

## Rules of thumb

- Pages compose features; features don't import from pages; features talk to each other via
  their `index.ts`.
- Local state by default. Zustand only for shared editor state; TanStack Query only for server
  state.
- Image processing runs off the render path (canvas/offscreen, object URLs revoked when done).
- Only `VITE_`-prefixed variables reach the browser. Secrets live on the server.
- Mock AI output is always labeled as a preview/mock in the UI.

## Design system

Tokens live in `src/styles/index.css` (`@theme`) and are used as Tailwind utilities
(`bg-surface`, `text-fg-muted`, `bg-accent-strong`, …). Shared primitives are exported from
`@/components/ui`: `Button`, `ButtonLink`, `buttonClasses`, `Container`, `Badge`,
`SectionHeading`, `Logo`. Use `Button` for actions and `ButtonLink` for navigation.

## Imports

Use the `@/` alias for anything outside the current folder (`@/lib/cn`, `@/features/frames`).
The alias is defined in both `tsconfig.app.json` (`paths`) and `vite.config.ts` (`resolve.alias`).

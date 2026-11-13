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
- `styles` — style catalog, `AvatarGenerationProvider` interface, mock provider, style picker and
  preview. Providers are injected with `GenerationProviderScope`.
- `frames` — frame presets (data), safe-area layout, deterministic canvas renderer
  (`drawAvatar`), editor with undo/redo.
- `export` — 1080×1080 PNG/JPEG export (same `drawAvatar` as the previews), dimension
  verification, file naming, download/share, live circular previews.
- `studio` — orchestrates editor steps (`StudioFlow`: photo → style → frame → download) and
  overall progress.

Shared visuals live in `src/components/avatar/` (SVG illustrations, CSS frame previews).

### Generation providers

`AvatarGenerationProvider.generate()` takes the cropped image, a style id, an `AbortSignal` and a
progress callback, and resolves with an image or rejects with a typed `GenerationError`.
`info.kind === 'mock'` makes the UI show "not AI" labelling. The Phase 6 provider will call our own
backend (never an AI vendor directly from the browser) and be passed to `GenerationProviderScope`.

Planned: backend + real AI provider (Phase 6), payments (Phase 7).

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

### Rendering and the safe area

`drawAvatar(ctx, size, settings, source)` is the single renderer for previews, thumbnails and
export. All geometry is proportional to `size` and computed by `layout.ts`, which
reserves room for glow/flames inside the inscribed circle. Keep any new frame effect inside
`normalizedLayout(...).effectOuter` and add it to the layout tests.

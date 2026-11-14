# Development phases

Each phase is implemented on its own, verified, documented here, and then paused for review.

| Phase | Scope                                           | Status                  |
| ----- | ----------------------------------------------- | ----------------------- |
| 0     | Project foundation                              | ✅ Complete             |
| 1     | Design system and landing page                  | ✅ Complete             |
| 2     | Camera capture and image upload                 | ✅ Complete             |
| 3     | Avatar style selection and mock generation      | ✅ Complete             |
| 4     | Frame customization editor                      | ✅ Complete             |
| 5     | Preview and high-resolution export              | ✅ Complete             |
| 6     | Backend and real AI generation                  | ✅ Complete — in review |
| 7     | Payments and usage limits                       | ⏳ Not started          |
| 8     | Testing, optimization, security, and deployment | ⏳ Not started          |

---

## Phase 0 — Project foundation

**Date:** 2026-11-13 · **Status:** Complete (approved; Phase 1 requested)

### Objectives

- Initialize a Vite + React + TypeScript project with strict type checking.
- Configure Tailwind CSS v4, React Router, a `@/` import alias, linting, formatting and unit testing.
- Establish the feature-based folder structure and an accessible, responsive app shell.
- Provide typed public-env access that keeps secrets out of the frontend.

### Installed versions

| Package                                      | Version                  | Why now                                            |
| -------------------------------------------- | ------------------------ | -------------------------------------------------- |
| react / react-dom                            | 19.3.1                   | UI runtime                                         |
| vite / @vitejs/plugin-react                  | 8.3.8 / 6.3.0            | Dev server and build                               |
| typescript                                   | 7.0.2                    | Type checking (`tsc -b`)                           |
| tailwindcss / @tailwindcss/vite              | 4.3.5                    | Styling (CSS-first config via `@theme`)            |
| react-router                                 | 8.5.1                    | Routing (`RouterProvider` from `react-router/dom`) |
| clsx / tailwind-merge                        | 2.1.1 / 3.7.0            | `cn()` class helper                                |
| oxlint                                       | 1.93.0                   | Linting (Vite template default)                    |
| prettier / prettier-plugin-tailwindcss       | 3.10.1 / 0.8.1           | Formatting, class sorting                          |
| vitest / jsdom                               | 5.1.0 / 31.0.1           | Unit/component tests                               |
| @testing-library/react, jest-dom, user-event | 16.3.3 / 7.0.1 / 14.6.10 | Component testing                                  |

Deliberately **not** installed yet (added in the phase that needs them): Zustand, TanStack Query,
React Hook Form, Zod, Lucide React, Motion, react-easy-crop, shadcn/ui, Playwright, and all backend
packages.

### Files created

- Config: `vite.config.ts`, `vitest.config.ts`, `tsconfig.test.json`, `.prettierrc.json`,
  `.prettierignore`, `.editorconfig`, `.env.example`, `.nvmrc`
- App: `src/main.tsx`, `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/RouteErrorBoundary.tsx`,
  `src/app/layouts/RootLayout.tsx`
- Pages: `src/pages/HomePage.tsx`, `src/pages/StudioPage.tsx`, `src/pages/NotFoundPage.tsx`
- Lib/config: `src/lib/cn.ts`, `src/lib/constants.ts`, `src/config/env.ts`, `src/vite-env.d.ts`
- Styles: `src/styles/index.css`
- Tests: `src/test/setup.ts`, `src/test/renderRoute.tsx`, `src/app/routes.test.tsx`,
  `src/lib/cn.test.ts`, `src/config/env.test.ts`
- Docs: `docs/phases.md`, `docs/architecture.md`, `README.md`
- Placeholders: `src/features/.gitkeep`, `src/components/ui/.gitkeep`

### Files modified (from the Vite template)

`package.json` (scripts, engines), `tsconfig.json`, `tsconfig.app.json` (strict flags, paths),
`tsconfig.node.json`, `.oxlintrc.json`, `.gitignore`, `index.html`, `public/favicon.svg`.
Removed template demo files (`src/App.tsx`, `src/App.css`, `src/index.css`, `src/assets/*`,
`public/icons.svg`).

### Verification (run 2026-11-13)

| Command                | Result                                              |
| ---------------------- | --------------------------------------------------- |
| `npm run typecheck`    | ✅ No errors                                        |
| `npm run lint`         | ✅ No errors or warnings (`--deny-warnings`)        |
| `npm run format:check` | ✅ All files formatted                              |
| `npm test`             | ✅ 3 files, 8 tests passed                          |
| `npm run build`        | ✅ Built (JS 345.7 kB / 108.7 kB gzip, CSS 10.5 kB) |

Manually checked the production build in headless Chrome at 1280×800 and 390×844: home, studio and
404 routes render; active nav state and dark theme are applied.

### Limitations / notes

- Home and Studio pages are placeholders; the landing page is Phase 1, the editor Phases 2–5.
- No Playwright/E2E tests yet — added once there are user flows worth covering (Phase 2+; full
  suite in Phase 8).
- Design tokens are a minimal foundation set; Phase 1 defines the full design system.
- The Inter font is referenced but not loaded; it falls back to the system UI font until Phase 1
  decides on self-hosted fonts.
- The JS bundle is a single chunk; route-level code-splitting will be added when the editor lands.
- Production hosting must serve `index.html` for unknown paths (SPA fallback) — handled in Phase 8.

---

## Phase 1 — Design system and landing page

**Date:** 2026-11-13 · **Status:** Complete (approved)

### Objectives

- Reusable, typed design system: tokens plus UI primitives.
- Marketing landing page: responsive header, hero with value proposition, style preview gallery,
  how it works, privacy messaging, FAQ, closing CTA and footer.
- A prominent **Create my avatar** CTA (header, hero, closing section) leading to `/studio`.
- Mobile-first layout, keyboard accessibility and semantic HTML.
- Out of scope (not implemented): upload, camera, AI generation, payments, backend.

### Dependencies added

| Package                    | Version | Why                                                       |
| -------------------------- | ------- | --------------------------------------------------------- |
| lucide-react               | 1.72.0  | Icons (tree-shaken per icon)                              |
| @fontsource-variable/inter | 5.3.0   | Self-hosted Inter variable font — no third-party requests |
| axe-core (dev)             | 4.14.0  | Automated accessibility checks in component tests         |

Not added: **Motion** (CSS transitions cover the few restrained animations; revisit for editor
interactions) and **shadcn/ui** (FAQ uses native `<details>`; no complex primitives needed yet).

### What was built

**Design system** (`src/components/ui/`, `src/styles/index.css`)

- Tokens: surfaces, text, accents, status, card radius, glow/card shadows, easing, `float` animation.
  `accent-strong` was darkened to `#7c3aed` so white button text meets WCAG AA.
- `Button` / `ButtonLink` sharing one variant map (`primary`, `gradient`, `secondary`, `ghost`;
  `sm`/`md`/`lg`; md/lg ≥ 44 px touch targets), `Container`, `Badge` (neutral/accent/premium),
  `SectionHeading`, `Logo`, `cn`-based class merging.
- Global: visible focus ring, reduced-motion support, smooth in-page scrolling, safe-area insets.

**App shell** (`src/app/layouts/`)

- `SiteHeader`: sticky, blurred; desktop nav; "Create" CTA always visible (short label on mobile);
  mobile menu with `aria-expanded`/`aria-controls`, closes on Escape (focus returns to toggle),
  on link click and on navigation.
- `SiteFooter`: brand, section links, studio link, illustration disclaimer.
- `useScrollToHash`: `/#section` links work from any route, scroll the target into view and move
  focus to it for keyboard and screen-reader users; other navigations scroll to top.
- Per-route document titles using React 19 `<title>` hoisting.

**Landing feature** (`src/features/landing/`)

- `content.ts`: all copy and data, typed. `types.ts`: `AvatarArtStyle`, `FrameStyle`.
- `Hero`: headline, supporting copy, primary + secondary CTA, highlights, mock profile card with a
  framed avatar, platform list.
- `StyleGallery`: five style cards (two marked Premium) and six frame treatments.
- `AvatarArt`: original hand-built SVG portraits for each style (no stock photos, no third-party
  art). `AvatarFrame`: CSS approximations of the frames (inset-based so rings scale with size).
- `HowItWorks` (ordered list), `PrivacySection`, `Faq` (native disclosure), `FinalCta`.
- All examples are labelled as illustrations, not AI output.

**Pages**: `HomePage` renders the landing feature; `StudioPage` and `NotFoundPage` restyled with the
design system (studio remains a placeholder).

### Files

Created: `src/components/ui/{Badge,Button,Container,Logo,SectionHeading}.tsx`,
`src/components/ui/{button-variants,index}.ts`, `src/components/ui/Button.test.tsx`,
`src/app/layouts/{SiteHeader,SiteFooter}.tsx`, `src/app/layouts/useScrollToHash.ts`,
`src/app/layouts/SiteHeader.test.tsx`, `src/features/landing/**` (13 files incl. 2 tests),
`src/test/axe.ts`.

Modified: `src/styles/index.css`, `src/main.tsx` (font import), `src/lib/constants.ts`
(section ids, nav links), `src/app/layouts/RootLayout.tsx`, `src/pages/*.tsx`,
`src/app/routes.test.tsx`, `src/test/setup.ts` (jsdom scroll/matchMedia stubs),
`.oxlintrc.json`, `package.json`, `docs/*`, `README.md`.

Removed: `src/features/.gitkeep`, `src/components/ui/.gitkeep`.

### Verification (run 2026-11-13)

| Command                | Result                                                       |
| ---------------------- | ------------------------------------------------------------ |
| `npm run typecheck`    | ✅ No errors                                                 |
| `npm run lint`         | ✅ No errors or warnings                                     |
| `npm run format:check` | ✅ All files formatted                                       |
| `npm test`             | ✅ 7 files, 27 tests passed (incl. axe on home, studio, 404) |
| `npm run build`        | ✅ JS 383.4 kB (120.2 kB gzip), CSS 33.4 kB (7.3 kB gzip)    |

Manual browser checks (production build, headless Chrome via a throwaway Playwright script — not
part of the repo):

- 390×844, 820×1180, 1440×900: no horizontal overflow, no console errors.
- Mobile menu opens, Escape closes it and restores focus, menu link scrolls to and focuses `#faq`.
- Tab order: skip link → logo → nav → header CTA → hero CTAs → … ; FAQ toggles with Enter.
- Contrast computed for all text/background token pairs: lowest is white on `#db2777` at 4.60:1
  (AA pass).

### Limitations / notes

- **Privacy and FAQ copy describe intended behaviour** (on-device editing, encrypted upload only
  for generation, no training use, deletion). These must be confirmed against the Phase 6–7
  implementation and a real privacy policy before launch.
- "Premium" badges and the "free to try" claim are placeholders until pricing is defined (Phase 7).
- Style examples are illustrations of different invented people, not one photo transformed.
- No Terms/Privacy-policy/Contact pages yet, so the footer doesn't link to them.
- axe in jsdom can't check colour contrast; it was verified separately (see above).
- No Playwright E2E suite in the repo yet (planned with the editor flow).
- The JS bundle is still a single chunk; the editor route will be lazy-loaded once it exists.

---

## Deployment (added between Phases 1 and 2)

- Repo: `devine-coded-div/Aviora`. Every push to `main` runs typecheck, lint, format check, tests
  and build in GitHub Actions, then deploys to GitHub Pages: https://devine-coded-div.github.io/Aviora/
- `BASE_PATH` (set in CI from the repo name) drives Vite's `base` and the router `basename`;
  `404.html` is a copy of `index.html` so deep links load.
- Pages must be enabled once in repo settings (Source: GitHub Actions); the default token can't.

---

## Phase 2 — Camera capture and image upload

**Date:** 2026-11-13 · **Status:** Complete (approved)

### Objectives

- Take a selfie with `getUserMedia` (explicit, user-initiated permission) or upload a file.
- Camera switching where supported; preview, retake; square cropping with react-easy-crop and a
  circular safe-area overlay.
- Handle denied permission, missing/busy cameras, unsupported browsers, unsupported formats and
  large files.
- Keep the original photo in temporary client state. **No uploads to any server.**

### Dependencies added

| Package         | Version | Why                                                  |
| --------------- | ------- | ---------------------------------------------------- |
| react-easy-crop | 6.2.5   | Crop UI: drag, pinch/scroll zoom, keyboard arrows    |
| zustand         | 5.1.0   | In-memory photo state shared with later editor steps |

### What was built (`src/features/capture/`)

- **Flow** (`CaptureFlow`): source → camera (primer → live) → review → crop → result, with a
  5-step progress indicator (Photo, Crop, Style, Frame, Download) and focus moved to each step's
  heading after user actions.
- **Explicit permission**: choosing "Take a selfie" shows a primer; `getUserMedia` runs only on
  "Turn on camera". The camera is stopped after capture, on Back, and on unmount (leaving the page).
- **Camera** (`useCamera`, `lib/camera.ts`): front camera by default (`facingMode: ideal`), up to
  1920 px; retries without resolution hints on `OverconstrainedError`; switch button only when
  more than one camera exists; front-camera shots mirrored to match the preview; stale requests
  cancelled.
- **Upload**: button (hidden native input) and drag-and-drop. JPG/PNG/WebP; HEIC/HEIF accepted
  only if the browser can decode it (Safari). Limits: 25 MB, min side 256 px, max 50 MP.
  Empty-MIME files resolved by extension. Unsupported-browser fallback: native camera app via
  `<input capture="user">`.
- **Crop** (`PhotoCropper`): square, `objectFit="cover"`, zoom 1–4× (slider + buttons), reset,
  arrow-key panning with an accessible label/description, dashed circular guide with dimmed
  corners. Output rendered locally to a 1080×1080 JPEG; crops narrower than 540 px are flagged as
  low resolution.
- **Result** (`CropResult`): square crop plus profile/feed/comment-size circle previews, "Adjust
  crop" (restores position and zoom), "Use a different photo".
- **State** (`store.ts`): `original` (untouched Blob + object URL + dimensions + source),
  `crop` settings, `cropped` result. Not persisted. Object URLs revoked on replace/reset.
- **Errors** (`lib/messages.ts`): plain-language title + next step for every error kind.

Studio page now renders the capture flow (visually hidden `h1`, step `h2`s).

### Files

Created: `src/features/capture/` — `types.ts`, `constants.ts`, `store.ts`, `index.ts`,
`lib/{validateImageFile,image,preparePhoto,camera,messages}.ts`, `hooks/useCamera.ts`,
`components/{CaptureFlow,SourcePicker,CameraCapture,PhotoReview,PhotoCropper,CropResult,Notice,SafeAreaOverlay,StepHeading}.tsx`,
tests `store.test.ts`, `lib/{validateImageFile,camera,preparePhoto}.test.ts`,
`components/{CaptureFlow,CropResult}.test.tsx`; `src/test/media.ts`.

Modified: `src/pages/StudioPage.tsx`, `src/test/setup.ts` (object URL stubs),
`src/test/renderRoute.tsx` (`applyAccept: false`), `vitest.config.ts` (`clearMocks`),
`package.json`, docs.

### Verification (run 2026-11-13)

| Command                | Result                                                    |
| ---------------------- | --------------------------------------------------------- |
| `npm run typecheck`    | ✅ No errors                                              |
| `npm run lint`         | ✅ No errors or warnings                                  |
| `npm run format:check` | ✅ All files formatted                                    |
| `npm test`             | ✅ 13 files, 86 tests passed                              |
| `npm run build`        | ✅ JS 433.3 kB (135.0 kB gzip), CSS 37.8 kB (8.0 kB gzip) |

Component tests assert that no `fetch`/XHR happens anywhere in the flow, that `getUserMedia` is
not called before the explicit click, that tracks stop after capture and on navigation, and run
axe on the first step and the denied-permission state.

Manual browser checks (production build, headless Chrome with `--use-fake-device-for-media-stream`,
throwaway script, not in repo):

- Camera: primer → live 1920×1920 stream → capture → review → retake → capture → crop
  (arrow keys + zoom) → 1080×1080 result; camera unmounted after capture; zero external requests.
- Permission denied (no auto-accept): "Camera access is blocked" with Try again / Upload.
- Uploads: 200×150 PNG → too small; .txt → unsupported; fake .heic in Chrome → HEIC message;
  corrupt JPG → couldn't open; 26 MB → too large; valid 1600×1200 JPG → crop → result → adjust.
- Screens reviewed at 390×844 and 1280×900.

### Limitations / notes

- The fake camera has one device, so camera switching was verified in unit/component tests only.
  Real-device testing on iOS Safari and Android Chrome is still needed.
- HEIC works only where the browser decodes it (Safari); elsewhere users get conversion advice.
- The photo lives in memory for the tab; a refresh clears it (by design, nothing is stored).
- Cropping has no rotation control yet.
- react-easy-crop injects a small `<style>` tag at runtime; account for this when a CSP is added
  (Phase 8).
- No Playwright suite in the repo yet; the fake-camera script is a good basis for one.

---

## Phase 3 — Avatar style selection and mock generation

**Date:** 2026-11-13 · **Status:** Complete (approved)

### Objectives

- Data-driven style catalog: Cartoon, Anime, Realistic, 2D, Pixel Art.
- Thumbnails, selected states, preview panel, generation progress, retry/error UI.
- Typed `AvatarGenerationProvider` interface plus a clearly labelled **mock** provider.
- No real AI, no paid API, no pretending the mock is AI.

No new dependencies.

### What was built

**Refactor (shared code):** the SVG avatar illustrations and CSS frames moved from `landing` to
`src/components/avatar/`; `Notice` and `StepHeading` moved to `src/components/ui/`. The step
progress indicator moved from `CaptureFlow` to the new `studio` feature.

**`src/features/styles/`**

- `catalog.ts` — 10 styles (2 per category), each with name, description, Premium flag,
  illustrated thumbnail (+ optional CSS filter) and mock settings. `StyleId` is derived from the
  data. Adding a style is a data change only.
- `generation/types.ts` — `AvatarGenerationProvider { info; generate({ image, styleId, signal,
onProgress }) }`, `ProviderInfo { kind: 'mock' | 'ai'; runsOnDevice }`, staged progress, and
  `GenerationError` with `kind` (`cancelled`, `invalid-input`, `timeout`, `rate-limited`, `network`,
  `provider-error`) and `retryable`.
- `generation/mockProvider.ts` — **MOCK**. Simulated queued → processing → finalizing progress,
  honours `AbortSignal`, validates input, optional simulated failures (`?mockFailRate=0–1` in the
  URL), then applies simple on-device colour effects. No AI, no network.
- `generation/effects.ts` — pure, tested pixel effects (saturation/contrast/brightness,
  posterize, tint, pixelate); `render.ts` is the thin canvas wrapper.
- `GenerationProviderScope` (React context) — defaults to the mock; tests and Phase 6 inject
  their own provider.
- `store.ts` — selected style and results cached per style, tied to the cropped photo URL; results
  are dropped and object URLs revoked when the photo changes; late results for an old photo are
  discarded.
- `useGeneration` — one job at a time, cancel, retry with attempt counting, cancels on unmount.
- UI: `StyleStep` (heading, disclosure, layout), `CategoryFilter` (toggle buttons),
  `StyleCatalog` (native radio group: arrow keys, one tab stop, selected ring + check, "preview
  ready" mark, Premium badge), `PreviewPanel` (original vs result, progress bar with stage text and
  Cancel, "Mock preview · not AI" badge, circular mini preview, Show original toggle, Regenerate,
  errors with Try again and a hint after 3 failures), polite live-region announcement on success.

**Honesty about the mock** — shown in three places: a "Preview mode — not AI" note at the top of
the step (rendered whenever `provider.kind === 'mock'`), a "Mock preview · not AI" badge on every
mock result (and "(mock preview)" in its alt text), and progress text that says "Applying preview
filter on your device…".

**`src/features/studio/`** — `StudioFlow` runs photo → style with a shared `StudioProgress`;
`CropResult` now has a "Choose a style" button.

### Files

Created: `src/features/styles/**` (catalog, types, messages, store, hooks/useGeneration,
generation/{types,mockProvider,effects,render,ProviderContext,providerContext},
components/{StyleStep,StyleCatalog,CategoryFilter,PreviewPanel}, index, 5 test files),
`src/features/studio/{StudioFlow,StudioProgress,index}.tsx|ts` + `StudioFlow.test.tsx`,
`src/components/avatar/index.ts`, `src/test/controlledProvider.ts`.

Moved: `AvatarArt`, `AvatarFrame`, `pixel-portrait(+test)`, avatar `types` →
`src/components/avatar/`; `Notice`, `StepHeading` → `src/components/ui/`.

Modified: `CaptureFlow` (props `onContinue`, `onStepChange`, `focusOnMount`; progress removed),
`CropResult` (continue button), `StudioPage` (renders `StudioFlow`, wider container), landing
imports, `components/ui/index.ts`, docs.

### Verification (run 2026-11-13)

| Command                | Result                                                    |
| ---------------------- | --------------------------------------------------------- |
| `npm run typecheck`    | ✅ No errors                                              |
| `npm run lint`         | ✅ No errors or warnings                                  |
| `npm run format:check` | ✅ All files formatted                                    |
| `npm test`             | ✅ 19 files, 133 tests passed                             |
| `npm run build`        | ✅ JS 452.5 kB (140.8 kB gzip), CSS 41.8 kB (8.6 kB gzip) |

Tests use a controllable fake provider to assert progress, success labelling, cancel (signal
aborted), retryable vs non-retryable errors, the 3-attempt hint, cached results, progress only on
the generating style, abort on unmount, no network, and axe before/during/after generation.

Manual browser checks (production build, headless Chrome, throwaway script):

- Upload → crop → Choose a style → heading focused; Bold Cartoon mock result in ~0.8–1.3 s with
  badge; 8-bit pixel mock in ~1.9–2.4 s; arrow keys move the radio selection; Pixel Art filter;
  cached result shown instantly; zero external requests (desktop and mobile).
- `?mockFailRate=1` → "Generation failed" + Try again; after 3 attempts the hint appears.
- Cancel returns to the Generate button.
- No horizontal overflow at 360/390/820/1280 px (fixed a fieldset `min-width` overflow found here).
- Phase 2 flow re-run: still works end to end.

### Limitations / notes

- The mock is colour filtering only; results look nothing like real AI styles, by design.
- Mock rendering runs on the main thread (~0.3–0.8 s at 1080 px); fine for a mock, a real
  provider will run server-side.
- Premium styles are only badged; nothing is gated until Phase 7 (UI says so).
- Generated results live in memory for the tab, like the photo.
- No "Continue to frames" yet — Phase 4.

**Review fix (2026-11-13):** the compare button's label now flips between "Show original" and
"Show styled" (previously it stayed "Show original" with only `aria-pressed` changing, which
wasn't visible). Verified in the browser and covered by the compare test.

---

## Phase 4 — Frame customization editor

**Date:** 2026-11-13 · **Status:** Complete (approved)

### Objectives

- Data-driven frame editor: flame overlays, dark theme, solid rings, gradients, neon, minimal
  borders (plus "No frame").
- Controls for colour, thickness, opacity and per-frame effects.
- Canvas API composition with deterministic rendering.
- Frames aligned with the circular safe area on desktop and mobile.
- Undo/redo/reset.

No new dependencies.

### What was built (`src/features/frames/`)

- **Model** (`types.ts`): one flat `FrameSettings` (kind, color, color2, thickness, opacity,
  effect, angle, background). Lengths are fractions of the square's side.
- **Presets** (`presets.ts`): 7 presets, each with defaults and a list of controls
  (`range` with min/max/step/format, or `color` with named swatches). The editor UI and value
  clamping (`sanitize`) are generated from this data.
  - Flame: core colour, tip colour, flame height, base ring, opacity, background.
  - Dark theme: ring tone, vignette, thickness, opacity, background.
  - Solid ring / Minimal: colour, thickness (minimal: line weight), opacity, background.
  - Gradient: start/end colours, direction (°), thickness, opacity, background.
  - Neon: colour, glow, thickness, opacity, background.
- **Layout** (`layout.ts`): pure geometry. The safe area is the circle inscribed in the square
  (radius 0.5). For each kind, the ring and any effect reach (neon glow, flame height) are
  reserved _inside_ that circle, so nothing drawn crosses it at any setting; the photo fills
  what's left.
- **Renderer** (`render/drawAvatar.ts`): background → clipped, centre-cropped photo → vignette
  (dark) → frame layer at the chosen opacity. Neon uses `shadowBlur` sized to its reserved reach;
  flames are 30 bezier tongues from a seeded PRNG (mulberry32, fixed seed) in two gradient layers
  plus a base ring. No `Math.random`, time or DPR inside the renderer.
- **Preview** (`FrameCanvas`): backing store = CSS width × `devicePixelRatio` (ResizeObserver);
  the safe-area guide is a CSS circle over the same box, so alignment holds by construction at
  every size. Circle/square view toggle. Preset thumbnails render the user's own avatar.
- **History** (`store.ts`): undo/redo/reset with a 50-step cap. Consecutive changes to the same
  control within 800 ms (a slider drag, a colour-picker drag) merge into one step; releasing a
  slider closes the step. Preset switches and resets are undoable. Buttons plus Ctrl/⌘+Z,
  Ctrl/⌘+Shift+Z and Ctrl+Y (ignored while typing in text fields).
- **Accessibility**: presets and swatches are native radio groups; sliders have labels, live value
  output and `aria-valuetext` ("32 px at 1080 pixels"); the preview canvas has a generated text
  alternative ("Your avatar with a neon frame in violet").
- **Studio**: "Continue to frames" on the style step (disabled while generating), with a note
  saying whether the styled preview or the plain crop will be framed. The frame step shows what is
  being framed and keeps the "Mock preview · not AI" label for mock results.

### Files

Created: `src/features/frames/` — `types.ts`, `presets.ts`, `layout.ts`, `format.ts`,
`describe.ts`, `store.ts`, `index.ts`, `render/drawAvatar.ts`, `hooks/useSourceImage.ts`,
`components/{FrameStep,FrameCanvas,FramePresetPicker,FrameControls,HistoryControls}.tsx`; tests
`presets.test.ts`, `layout.test.ts`, `store.test.ts`, `render/drawAvatar.test.ts`,
`components/FrameStep.test.tsx`.

Modified: `src/features/studio/StudioFlow.tsx` (+ test), `src/features/styles/components/StyleStep.tsx`
(+ test; `onContinue`), `src/test/setup.ts` (quiet canvas/media stubs), docs.

### Verification (run 2026-11-13)

| Command                | Result                                                    |
| ---------------------- | --------------------------------------------------------- |
| `npm run typecheck`    | ✅ No errors                                              |
| `npm run lint`         | ✅ No errors or warnings                                  |
| `npm run format:check` | ✅ All files formatted                                    |
| `npm test`             | ✅ 24 files, 235 tests passed                             |
| `npm run build`        | ✅ JS 474.2 kB (146.9 kB gzip), CSS 43.9 kB (8.8 kB gzip) |

Unit tests: the safe-area invariant for every min/max combination of every preset's sliders (41
combinations); linear scaling of the layout; identical draw-call logs on repeated renders; every
length argument exactly doubling between 500 px and 1000 px renders; flame points and neon glow
inside the circle at maximum settings; history coalescing/undo/redo/reset/cap; editor behaviour and
axe.

Real Chrome (throwaway harness rendering the real `drawAvatar` with a real photo, then deleted):

- 7 presets × {min, max, default}: two 1080×1080 renders are **pixel-identical** (`toDataURL`).
- Same 21 cases: **zero pixels drawn outside the inscribed circle** (sampled every 2 px).
- 540 px render vs 1080 px render downscaled: mean difference 0.07–0.6 levels (of 255).

Real app (production build): safe-area guide offset from the canvas is 0.00 px at 360×740@2,
390×844@3, 820×1180@2, 1440×900@1; backing store = CSS size × DPR; no horizontal overflow;
undo×2 then redo×2 restores identical pixels; Ctrl+Z works; zero external requests. Phase 2 and 3
browser checks re-run and still pass.

### Limitations / notes

- Thumbnails re-render with every preset (7 × 144 px canvases); fine on current devices.
- Frame settings are kept in memory for the tab, like the photo.
- Flame shapes are fixed (deterministic by design); there's no "shuffle flames" control.
- No download yet — Phase 5 renders the same `drawAvatar` at 1080×1080 for export.

**Review fix (2026-11-13): changing the photo keeps the style.** The selected style was already
kept, but its result was discarded with the old photo, so users saw their plain new photo and a
"Generate" button — it looked like the style was lost. Now, if the selected style had been
applied, changing the photo (new upload or re-crop) re-applies that style to the new photo
automatically (`pendingId` in the style store; cleared when it starts, on success, or if the user
cancels). A style that was selected but never generated just stays selected. Results from the old
photo are never shown over the new one. Verified in Chrome on the production build and on the
dev server (React StrictMode double-mount); 7 new tests (242 total).

---

## Phase 5 — Preview and high-resolution export

**Date:** 2026-11-13 · **Status:** Complete (approved)

### Objectives

- Live circular preview and an export workflow.
- 1080×1080 square containing the selected avatar, crop, background and frame; essential content
  inside the circular safe area.
- PNG and JPEG, download naming, loading/error states, accurate composition.
- Verify exported dimensions and that the export matches the editor preview.

No new dependencies.

### What was built (`src/features/export/`)

- **`renderAvatarImage`** — creates a 1080×1080 canvas and calls the **same `drawAvatar`** used by
  the frame editor and every preview, then encodes PNG or JPEG (quality 60–100 %, default 92 %).
  Errors are typed: `source-missing`, `canvas-unavailable`, `encode-failed` (incl. a browser
  silently falling back to another MIME type), `size-mismatch`, `download-failed`.
- **Verification** — every export is decoded again (`createImageBitmap`) and rejected unless it is
  exactly 1080×1080 before it reaches the user.
- **Naming** (`lib/fileName.ts`) — default `avatar-<style>-<frame>-1080x1080.<png|jpg>`; the base is
  editable and sanitized (ASCII lowercase, dashes, accents stripped, path characters removed,
  60-char cap, falls back to `avatar`). The final name is shown before downloading.
- **Delivery** (`lib/deliver.ts`) — temporary `<a download>` link (URL revoked after 30 s); on
  devices whose share sheet accepts files, a **Share** button (dismissing the sheet isn't an error).
- **`useExport`** — idle → preparing → done (file name, dimensions, size) / error with retry. Each
  state remembers the request it belongs to, so changing format, quality, name or frame clears a
  stale "Downloaded" message (derived in render, no state-in-effect).
- **`ExportStep`** (step 5) — live previews drawn by the shared renderer: **Profile** (circle in a
  profile header), **Square** (the full file, showing the corners circle-cropped platforms hide),
  **Sizes** (profile, story ring, feed, comment); safe-area toggle; format cards; JPEG quality;
  file name; Download/Share; success and error states; "Mock style, not AI" note for mock
  results.
- **Studio** — "Continue to download" on the frame step; progress shows step 5; Back returns to
  frames. `frames` now also exports `FrameCanvas`, `useSourceImage` and `describeFrame`.

### Files

Created: `src/features/export/` — `types.ts`, `messages.ts`, `index.ts`,
`lib/{renderAvatarImage,fileName,deliver}.ts`, `hooks/useExport.ts`,
`components/{ExportStep,AvatarPreviews}.tsx`; tests `lib/{renderAvatarImage,fileName,deliver}.test.ts`,
`components/ExportStep.test.tsx`.

Modified: `src/features/studio/StudioFlow.tsx` (+ test), `src/features/frames/components/FrameStep.tsx`
(+ test; `onContinue`), `src/features/frames/index.ts`, docs.

### Verification (run 2026-11-13)

| Command                | Result                                                    |
| ---------------------- | --------------------------------------------------------- |
| `npm run typecheck`    | ✅ No errors                                              |
| `npm run lint`         | ✅ No errors or warnings                                  |
| `npm run format:check` | ✅ All files formatted                                    |
| `npm test`             | ✅ 28 files, 285 tests passed                             |
| `npm run build`        | ✅ JS 487.8 kB (150.2 kB gzip), CSS 44.9 kB (9.0 kB gzip) |

Unit/component tests: canvas created at 1080×1080 and drawn with `drawAvatar(ctx, 1080, settings,
source)`; PNG/JPEG MIME and quality; every error kind; wrong decoded size is refused and never
downloaded; file naming and sanitization; download link + delayed revoke; share supported /
unsupported / dismissed; loading, success, error + retry, stale-state clearing; preview views; axe
before and after a download.

Real Chrome, production build, actual downloaded files inspected with Pillow:

- Upload → crop → Anime Classic (mock) → Flame at max height → download PNG and JPEG (custom name
  "My Insta Pic!! 2026" → `my-insta-pic-2026-1080x1080.jpg`).
- Both files: **1080×1080**, correct format; PNG fully opaque (alpha 255).
- **Desktop (DPR 1) and mobile (DPR 3) PNG exports are byte-identical** (same SHA-256).
- **Outside the circular safe area: 61,387 sampled pixels, 0 differ from the background**, in both
  PNG and JPEG.
- **Export vs editor preview** (export downscaled to the preview canvas size): mean difference
  0.47/255 (416 px desktop preview) and 0.26/255 (1068 px mobile preview).
- PNG vs JPEG at 85 %: mean difference 1.1/255.
- No horizontal overflow, zero external requests. Phase 2–4 browser checks re-run and pass.

### Limitations / notes

- Export size is fixed at 1080×1080 (the spec's default). Larger sizes would be a one-line option.
- iOS Safari opens downloads in a preview first; the Share button is the smoother path on iPhone.
- PNG output is RGBA (fully opaque) — browsers' canvas encoders always write an alpha channel.
- Everything stays in the browser; nothing is uploaded.

---

## Phase 6 — Backend API and generation pipeline

**Date:** 2026-11-13 · **Status:** Complete, awaiting approval

### Objectives

Express TypeScript API with upload validation, private object storage, a generation job lifecycle
(pending / processing / completed / failed, retries, cleanup of temporary images), a server-side AI
provider adapter, rate limiting and status endpoints. Credentials never reach the browser. **A real
AI provider is only added once its credentials, capabilities, cost and retention terms are
configured — none is connected in this phase.**

### What was built (`server/`, a sibling package)

See `server/README.md` for the full API and operating notes.

- **Stack**: Express 5, TypeScript 7, Prisma 7.10.1 (pg driver adapter) on PostgreSQL, AWS SDK v3
  for S3-compatible storage, sharp, zod, helmet, cors, express-rate-limit, multer.
- **Config** (`src/config.ts`): zod-validated env. Refuses to start in production without a client
  hashing secret, S3 storage and CORS origins. **Provider gate**: any `AI_PROVIDER` other than
  `mock` requires API key, supported styles, cost per image, provider retention days (≤ 30),
  `AI_PROVIDER_TRAINS_ON_INPUTS=false` and a daily budget, and an implemented adapter; otherwise
  the server exits listing what's missing.
- **Uploads** (`src/uploads/validateImage.ts`): size limit, decode-based format check
  (JPEG/PNG/WebP), 256–4096 px, no animation, decompression-bomb guard, re-encode to a 1024×1024
  PNG that strips all metadata.
- **Storage**: `S3Storage` (private, key prefix, `no-store`) and `MemoryStorage` (dev/test only).
- **Jobs**: Prisma model `GenerationJob` (+ hand-written SQL migration, see below). `JobService`
  (create with per-client active-job cap and daily budget reservation; token-authorized read,
  retry, delete). `JobWorker` (claims with `FOR UPDATE SKIP LOCKED`, timeouts via `AbortSignal`,
  backoff retries, stale-job recovery, discards results of deleted jobs). `sweep()` cleanup.
- **HTTP**: endpoints for health, provider info, create, status, result, retry, delete; uniform
  JSON errors that never leak internals; helmet headers, `no-store`, CORS allowlist; rate limits
  per minute / per hour keyed by an HMAC of the client IP (IPv6 /56).
- **Provider adapter**: `AvatarProvider` interface + typed `ProviderError` with retryability;
  `mock` provider (sharp filters, simulated latency/failures, `kind: "mock"`); empty adapter
  registry for real vendors.
- **Frontend client** (`src/features/styles/generation/apiProvider.ts`): implements the existing
  `AvatarGenerationProvider` (upload → poll → download → delete the server copy, cancel deletes the
  job, server error codes mapped to UI error kinds, server-side mocks stay labelled as mocks).
  **Not switched on in the UI yet** — the live site keeps the on-device mock until the API is
  hosted.
- **CI**: new `server` job with a Postgres 16 service container: `prisma generate`, real
  `prisma migrate deploy`, schema-drift check (`prisma migrate diff --exit-code`), typecheck, lint,
  format, integration tests, build. Frontend deploy now waits for it.

### Workspace constraint (Prisma)

This workspace can't reach `binaries.prisma.sh`, so the Prisma CLI's schema engine is unavailable
here. `prisma generate` works (with `PRISMA_SCHEMA_ENGINE_BINARY` pointed at a dummy path) and
Prisma Client queries work through the pg adapter, but `prisma migrate` doesn't. The initial
migration SQL was therefore written by hand in Prisma's format and applied locally with `psql`;
CI (which can reach Prisma) runs the real `prisma migrate deploy` and fails if the SQL and
`schema.prisma` ever differ. Local development on a normal machine uses the Prisma CLI as usual.

### Files

Created: `server/` — `package.json`, `package-lock.json`, `tsconfig*.json`, `vitest.config.ts`,
`prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/**`, `.env.example`, `.gitignore`,
`.prettierrc.json`, `.prettierignore`, `.oxlintrc.json`, `README.md`,
`src/{config,styles,db,server}.ts`, `src/storage/{types,memory,s3}.ts`,
`src/providers/{types,mock,registry}.ts`, `src/uploads/validateImage.ts`,
`src/jobs/{tokens,errors,service,worker,cleanup}.ts`, `src/http/{app,errors,serialize}.ts`,
`test/{globalSetup,helpers,api.test,cleanup.test,s3.test,config.test,s3rver.d}.ts`.
Frontend: `src/features/styles/generation/apiProvider.ts` (+ test).

Modified: `.github/workflows/deploy.yml` (server job; deploy needs it), root `.prettierignore` and
`.oxlintrc.json` (exclude `server/`), `src/features/styles/index.ts`, docs.

### Verification (run 2026-11-13)

| Command                                           | Result                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `server: npm run typecheck / lint / format:check` | ✅ Clean                                                             |
| `server: npm test`                                | ✅ 4 files, 48 tests (real Postgres 16 + s3rver), 3 consecutive runs |
| `server: npm run build`                           | ✅ Compiled to `dist/`                                               |
| `npm run check` (frontend)                        | ✅ 29 files, 295 tests; build OK                                     |
| `npm audit --omit=dev` (server)                   | ✅ 0 vulnerabilities                                                 |

Integration tests cover: valid upload → pending + token (token/IP stored only hashed); metadata
and GPS stripped; rejections (no file, GIF, SVG, text, too small, too large, animated WebP, size
limit, unknown/unsupported style); token-only access with identical 404s; no internal fields in
responses; pending → processing → completed with result download and input deletion; backoff
retry; failure after max attempts then manual retry; non-retryable failures; manual-retry limit;
stale-job recovery; competing workers process a job once; missing input; delete (incl. while
processing); hourly and active-job limits; daily budget; CORS allowlist; security headers; JSON
404s; internal errors hidden; cleanup (result TTL, failed-input TTL, leftover inputs, abandoned
jobs); S3 roundtrip and a full generation through S3; config gate and production requirements;
no secrets in `/api/provider`; server and frontend style catalogs identical.

Manual checks: compiled server started for real and exercised with curl (pending → processing →
completed automatically, 1024×1024 PNG result, 404 without token, 422 for a text file, 204 delete,
CORS allowed/blocked); server exits with clear messages for a half-configured provider, a provider
without an adapter, and production without secrets; the frontend API client run against the real
server produced a PNG, kept `kind: "mock"`, and deleted its job afterwards (0 rows left).

Issues found and fixed during the phase: IPv6 clients could bypass rate limits (now keyed by /56);
a test fixture that wasn't really animated; a flaky test caused by two simulated instances not
sharing storage; unhandled "no adapter" startup error.

### Limitations / open decisions

- **Not deployed.** GitHub Pages is static; the API needs a Node host, a Postgres database and a
  private bucket. Needs your choice of providers (e.g. Render/Railway/Fly.io + Neon/Supabase +
  Cloudflare R2/S3).
- **No real AI provider.** Needs a vendor choice and its terms (see `server/README.md`).
- The frontend still uses the on-device mock; switching to the API client is a small change once
  the API is hosted (show "Connecting…" while `/api/provider` loads, keep mock labelling).
- Rate limits are per process (in memory); with several instances, use a shared store
  (Redis/Postgres) for express-rate-limit. The job queue itself is already multi-instance safe.
- No user accounts yet; jobs are protected by capability tokens. Phase 7 adds payments and usage
  limits per user.

## Phase 7 — Free quota, credit packs and payments ✅

Server-enforced entitlements with an append-only credit ledger, Razorpay orders created and
verified on the server, and an upgrade modal in the studio. Payments run in **Razorpay test mode**
only; the frontend never decides what a user is entitled to.

### What was built

- **Anonymous accounts** (`X-Account-Token`, stored hashed; the token doubles as a restore code for
  moving credits to another device).
- **Free quota**: 3 free-style generations per rolling 24 h, counted per account _and_ per client
  IP hash. **Premium styles** and over-quota generations cost 1 credit.
- **Ledger** with unique idempotency keys for charges, refunds and purchases; charging under an
  advisory lock + row lock; automatic refunds when a job fails or is deleted early (also after
  crash recovery).
- **Razorpay**: server price table (₹99/10, ₹249/30, ₹699/100 — placeholders), orders created
  server-side, checkout signature verification **plus** a server fetch of the payment (captured,
  exact amount), signed webhooks with event-id de-duplication in the same transaction,
  `pending` / `failed` / `expired` order states, order expiry, live-key guard.
- **Frontend**: credits bar on the style step, upgrade modal (packs, test-mode banner, purchase
  states: starting → checkout → verifying → paid / pending (polled) / failed (retry) / cancelled,
  restore code), "Get credits" on `payment-required` errors, server-connection state with retry.
  The deployed site still runs the on-device mock (no API is hosted), so billing is only active
  when `VITE_API_BASE_URL` is set.

### Verification (run 2026-11-14)

| Command                                   | Result                                           |
| ----------------------------------------- | ------------------------------------------------ |
| `server: npm run typecheck`               | ✅ Clean                                         |
| `server: npm test`                        | ✅ 5 files, 87 tests (real Postgres 16 + s3rver) |
| `npm run typecheck / lint / format:check` | ✅ Clean                                         |
| `npm test` (frontend)                     | ✅ 33 files, 318 tests                           |
| `npm run build`                           | ✅                                               |

Server billing tests cover: quota per account and per IP; premium charging; insufficient credits
→ 402 with nothing charged; refunds on failure and on delete; concurrent charges never overspend;
order amounts from the server only; valid / forged / mismatched / uncaptured payments; replayed
verify and webhook never grant twice; webhook signature on the raw body; failed and expired
orders; live keys refused outside production. Frontend tests cover the API client, checkout
loader, every purchase outcome, polling a pending payment, restore, disabled payments, and the
studio in API mode (server down → retry → premium style → 402 → upgrade modal).

Fixed during the phase: "Retry" on the credits bar didn't retry a failed account creation.

### Limitations

- Not exercised against Razorpay's real sandbox: its hosts are unreachable from the build
  environment and no test keys were provided. The integration follows Razorpay's documented
  signature scheme and is tested against a fake Razorpay API. Needs one manual sandbox purchase.
- Anonymous accounts: clearing browser storage without saving the restore code loses credits.
- Prices are placeholders; GST/invoicing and refund policy pages are not done.

## Phase 8 — Audit, end-to-end tests and release readiness ✅

Audited responsiveness, accessibility, image-processing performance, privacy, API security,
payment integrity, error handling, observability and deployment readiness. Added Playwright
suites that run in CI, fixed what the audit and the new tests found, and wrote the deployment
guide and release checklist.

### End-to-end tests (Playwright)

`npm run test:e2e` — production build, mock mode, **desktop Chrome and Pixel 7** (36 tests):

- **Core journey**: landing → upload → crop → style → frame → download; PNG and JPEG are decoded
  and checked to be exactly 1080 × 1080; custom file names are sanitised.
- **Export fidelity**: the downloaded PNG, scaled to the on-screen preview, differs from the
  preview canvas by a mean of 0.25–0.42 / 255 per channel (test limit 2).
- **Camera** (Chrome's synthetic camera): live preview, capture → crop, camera released after
  capture and when leaving the studio mid-capture; blocked permission → explanation + upload.
- **Upload validation**: text file, tiny image, corrupt JPEG, 26 MB file — each rejected with the
  right message, then a valid photo is accepted. The photo never leaves the device in mock mode
  (no non-GET requests at all).
- **Layout**: no sideways scrolling on any step at 320 px, 412 px and desktop; primary buttons
  are on screen and ≥ 44 px tall.
- **Accessibility**: axe-core (WCAG 2.2 A/AA, including colour contrast, which jsdom can't
  check) on the landing page and every studio step, desktop and mobile.
- **Recovery**: 404 page; reload mid-flow; connection lost after load; failed generation →
  retry or frame the plain photo; studio chunk missing after a redeploy → "Reload page".

`npm run test:e2e:fullstack` — production build against the **real API server, a fresh Postgres
database and a local fake Razorpay** (REST API, signed webhooks, stand-in checkout.js; test keys
only) (5 tests):

- Free generation → quota used → 402 → upgrade modal (axe-checked) → purchase → premium style
  costs 1 credit → 1080 × 1080 download; honest "sent to our server" copy in API mode.
- Replaying the signed checkout response 3× grants credits once; the same payment against
  another order and a forged signature are rejected.
- Authorized payment stays pending, then the webhook (delivered twice) completes it exactly once
  and the open modal updates by itself.
- Declined card and closed checkout leave the balance untouched.
- Restore code moves credits to a second browser.

Both suites run in CI (new `e2e` job with a Postgres service); deployment now needs it to pass.

### Audit findings fixed

| Area           | Finding (verified)                                                                                                                                                           | Fix                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsiveness | On phones, **Download**, **Show original** and **Regenerate** collapsed to 24 px tall (`flex-1` in a column layout)                                                          | Grow only in row layout (`sm:flex-1`); 44 px touch-target test                                                                                                                                     |
| Accessibility  | "How it works" step numbers had 1.95:1 contrast                                                                                                                              | Raised to the subtle text colour (passes 3:1 for large text)                                                                                                                                       |
| Privacy        | In API mode the copy said "Your photo isn’t uploaded" / "Nothing is uploaded" although the server generates the preview                                                      | Copy now depends on where generation runs; API mode says the photo is sent and deleted automatically                                                                                               |
| Performance    | Landing page downloaded the whole studio (543 kB JS, 167 kB gzip)                                                                                                            | Studio route is lazy-loaded: landing 412 kB (129 kB gzip), studio chunk 133 kB (40 kB gzip)                                                                                                        |
| Error handling | The mock renderer was a separate 1.6 kB chunk: a dropped connection made generation fail with a generic error, and retry could never recover (browsers cache failed imports) | Bundled into the studio chunk                                                                                                                                                                      |
| Error handling | A missing page chunk after a redeploy showed a generic error with no recovery                                                                                                | Specific message + **Reload page**                                                                                                                                                                 |
| Error handling | Credits bar "Retry" didn't retry a failed account creation (Phase 7 finding)                                                                                                 | Fixed (Phase 7 commit)                                                                                                                                                                             |
| Observability  | No request ids or request logs; text-only logs; gateway errors logged without their cause                                                                                    | JSON logs (`LOG_FORMAT`), `X-Request-Id` on every response and in 500 bodies, one log line per request with the route pattern only (tested to contain no tokens or ids), gateway root cause logged |
| API security   | Production accepted short hashing secrets and non-https CORS origins                                                                                                         | Refused at startup (tested)                                                                                                                                                                        |
| Deployment     | No container image or migration runbook                                                                                                                                      | `server/Dockerfile` (runtime + `migrate` target) built and health-checked in CI; `docs/deployment.md`; `docs/release-checklist.md`; `VITE_API_BASE_URL` read from a repository variable            |

Audited and found sound (no change): server-side upload validation and metadata stripping,
capability tokens and hashed account tokens, CORS allowlist, Helmet headers, rate limits incl.
IPv6 /56, request size limits, server-defined prices, signature + payment-fetch verification,
idempotent ledger, webhook de-duplication, refunds, live-key guard, object-URL revocation, camera
release, no third-party requests before checkout, `npm audit` clean in both packages.

Image processing measured with a 24-megapixel JPEG in headless Chrome (desktop CPU): decode +
prepare ≈ 0.3 s, crop ≈ 0.2 s, JS heap ≈ 16 MB. Real low-end phones will be slower; not measured
on devices.

### Verification (run 2026-11-14)

| Command                                           | Result                                |
| ------------------------------------------------- | ------------------------------------- |
| `npm run typecheck / lint / format:check`         | ✅ Clean (app, tests, e2e, configs)   |
| `npm test`                                        | ✅ 33 files, 318 tests                |
| `npm run build`                                   | ✅                                    |
| `server: typecheck / lint / format:check / build` | ✅                                    |
| `server: npm test`                                | ✅ 6 files, 93 tests (twice)          |
| `npm run test:e2e`                                | ✅ 36 tests, desktop + mobile (twice) |
| `npm run test:e2e:fullstack`                      | ✅ 5 tests (twice)                    |
| `npm audit` (frontend, server)                    | ✅ 0 vulnerabilities                  |

The Docker images could not be built here (no Docker daemon); CI builds them and checks
`/api/health` on the next push.

### Remaining risks

1. **No real AI.** Every style is a labelled colour-filter mock. A provider needs a vendor
   choice, contract terms and an adapter.
2. **API not deployed.** The live site runs in on-device mock mode; accounts and purchases only
   exist when `VITE_API_BASE_URL` points at a hosted API.
3. **Razorpay not exercised against the real sandbox.** Its hosts are unreachable from the build
   environment and no test keys were provided. The flow is verified against a faithful local fake
   (documented signature schemes, REST shapes, webhooks); one real sandbox run is on the release
   checklist. The suggested CSP entries for Razorpay are likewise unverified.
4. **Anonymous accounts.** Clearing browser storage without saving the restore code loses
   purchased credits; anyone holding the code can spend them. Real sign-in (email/OTP) is the fix.
5. **Rate limits are per process.** Running more than one API instance multiplies them; use a
   shared store first.
6. **Real devices not tested.** Camera behaviour is tested with Chrome's synthetic camera; iOS
   Safari / Android Chrome, share sheet and low-end performance need a manual pass.
7. **Legal and pricing.** Prices are placeholders; privacy policy/FAQ, terms, refund policy and
   GST/invoicing must be finalised before charging real money.
8. **No security headers on GitHub Pages** (host limitation) and no error monitoring service
   (e.g. Sentry) on the frontend; server errors are only in logs.

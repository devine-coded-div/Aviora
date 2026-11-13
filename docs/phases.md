# Development phases

Each phase is implemented on its own, verified, documented here, and then paused for review.

| Phase | Scope                                           | Status                  |
| ----- | ----------------------------------------------- | ----------------------- |
| 0     | Project foundation                              | ✅ Complete             |
| 1     | Design system and landing page                  | ✅ Complete             |
| 2     | Camera capture and image upload                 | ✅ Complete             |
| 3     | Avatar style selection and mock generation      | ✅ Complete             |
| 4     | Frame customization editor                      | ✅ Complete — in review |
| 5     | Preview and high-resolution export              | ⏳ Not started          |
| 6     | Backend and real AI generation                  | ⏳ Not started          |
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

**Date:** 2026-11-13 · **Status:** Complete, awaiting approval

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

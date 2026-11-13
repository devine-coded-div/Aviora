# Development phases

Each phase is implemented on its own, verified, documented here, and then paused for review.

| Phase | Scope                                           | Status                  |
| ----- | ----------------------------------------------- | ----------------------- |
| 0     | Project foundation                              | ✅ Complete             |
| 1     | Design system and landing page                  | ✅ Complete             |
| 2     | Camera capture and image upload                 | ✅ Complete — in review |
| 3     | Avatar style selection and mock generation      | ⏳ Not started          |
| 4     | Frame customization editor                      | ⏳ Not started          |
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

**Date:** 2026-11-13 · **Status:** Complete, awaiting approval

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

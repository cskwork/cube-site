# Cube Site

> Render **any website** inside an interactive 3D cube. Decorate the cube with trendy "꾸미기" presets, drop stickers, imprint text, and share the whole thing — site + decoration — through a single URL hash.

A Three.js 3D site-portal: one cube face shows a live, interactive `<iframe>` of any URL, tracked to the face each frame. It **also** ships a real, spec-correct implementation of Chrome's experimental **HTML-in-Canvas** API (`ctx.drawElementImage()`) as an opt-in, capability-gated live-face mode that paints live DOM onto the cube via a WebGL texture.

```
┌──────────────────────────┐  ┌──────────────────┐
│                          │  │  꾸미기          │
│        ╱──────────╲      │  │  글자 새기기     │
│       ╱            ╲     │  │  공유            │
│      │  ◢ live ◣   │    │  │ ──────────────── │
│      │  iframe    │     │  │  URL:            │
│       ╲           ╱     │  │  [https://...]   │
│        ╲─────────╱      │  │  적용            │
│                          │  │ ──────────────── │
│  drag empty space        │  │ 초기화 · 공유 링크│
└──────────────────────────┘  └──────────────────┘
```

## ✨ What it does

- **Cube IS the site.** One face of the cube is a real `<iframe>`, screen-tracked to the live face each frame over the Three.js WebGL canvas. You click buttons, scroll, type, submit forms — through the cube. (A 2D overlay was chosen over `CSS3DRenderer` because Chrome's CSS-3D iframe hit-testing is unreliable.)
- **Three live-face modes.** `실제 사이트` (interactive iframe, default), `스타일 카드` (a Canvas2D site-preview card for sites that block framing), and `HTML-in-Canvas` (experimental — see below).
- **Decorate the other 5 faces.** 5 trend presets (Y2K Cyber, Frutiger Aero, Soft Pastel, Holographic, Bento), color/glow/hue/radius sliders, 24 emoji stickers, per-face text imprint.
- **Swap any URL at runtime.** A `라이브 사이트 URL` field in the 공유 tab — paste any URL, hit 적용, and the cube becomes that site.
- **Share via URL hash.** The decoration state AND the active URL serialize to a compact base64url hash. Copy the link, paste in another tab/device, identical cube reappears.
- **Pure static site.** Vite + TypeScript + Three.js. `npm run build` emits `dist/` that drops onto GitHub Pages / Vercel / Netlify / Cloudflare Pages / S3 with no backend.
- **Korean-first UI** following the [10 award-worthy web design rules](https://github.com/cskwork/web-design-10-rules) — tokens, 8pt rhythm, instant 5-second clarity, prefers-reduced-motion, WCAG-grade focus rings.

## 🚀 Quick start

```bash
git clone <this-repo>
cd cube-site
npm install
cp .env.example .env     # optional — TARGET_URL etc. are runtime-editable
npm run dev              # http://localhost:5173
```

Production build:

```bash
npm run build            # → dist/
npx serve dist           # smoke-test locally on http://localhost:3000
```

## 🧩 How HTML-in-Canvas fits

Chrome's [HTML-in-Canvas](https://developer.chrome.com/blog/html-in-canvas-origin-trial) (WICG `drawElementImage`) lets you paint live DOM into a `<canvas>`. The `HTML-in-Canvas` live-face mode is a real implementation of it:

1. A hidden `<canvas layoutsubtree>` hosts a live HTML panel as its direct child ([`src/htmlCanvas/livePanel.ts`](src/htmlCanvas/livePanel.ts)).
2. On each `onpaint`, `ctx.drawElementImage(panel, 0, 0)` snapshots that DOM into the canvas ([`src/htmlCanvas/adapter.ts`](src/htmlCanvas/adapter.ts)).
3. That canvas backs a `THREE.CanvasTexture` mapped onto the rotating cube's live face ([`src/htmlCanvas/liveFace.ts`](src/htmlCanvas/liveFace.ts)) — so it's genuinely *HTML → canvas → WebGL*.

The adapter feature-detects `ctx.drawElementImage` (`detectMode()`); the [status banner](src/ui/banner.ts) reports whether native mode is active, and the mode pill is disabled with an explanation when it isn't.

**This is an experimental, single-browser feature** — it runs only on Chromium 147+ with the `chrome://flags/#canvas-draw-element` flag, or Chrome 148–151 with an Origin-Trial token; never Firefox/Safari. So `실제 사이트` (iframe) is the honest cross-browser default, and the `HTML-in-Canvas` mode gracefully falls back to the iframe when unsupported.

## 🌐 Live demo

- **GitHub Pages (production):** https://cskwork.github.io/cube-site/

To experience the experimental HTML-in-Canvas mode, open it in Chrome/Brave 147+ with `chrome://flags/#canvas-draw-element` enabled, then pick `HTML-in-Canvas` in the 공유 tab's 미리보기 모드.

## 📦 Deploy

### GitHub Pages (recommended for OSS)

The repo ships with [`.github/workflows/pages.yml`](.github/workflows/pages.yml). On every push to `main`:

1. CI runs typecheck + tests.
2. Builds with `BASE_PATH=/<repo-name>/`.
3. Publishes `dist/` to the `gh-pages` environment.

Enable Pages in repo Settings → Pages → Build and deployment → Source: **GitHub Actions**.

Optional repo secrets / variables:
- `OT_TOKEN` (secret) — Chrome HTML-in-Canvas Origin Trial token.
- `TARGET_URL` (variable) — default URL the cube loads on first visit.

### Vercel

```bash
npm i -g vercel
vercel --prod
```

Or click the GitHub → Vercel "Import Project" button — [`vercel.json`](vercel.json) is already wired (build `npm run build`, output `dist`, immutable asset caching).

Set `TARGET_URL` and `OT_TOKEN` as Vercel project env vars if you want non-default initial URL or to ship the OT meta tag.

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Cloudflare Pages

```bash
npm i -g wrangler
wrangler pages deploy dist --project-name=cube-site
```

### S3 + CloudFront

```bash
BUCKET=my-bucket DISTRIBUTION_ID=E123ABC ./deploy/s3.sh
```

The bundled `deploy/*.sh` scripts cover all four.

## ⚙️ Configuration

Everything is optional — the app boots with sane defaults and the 공유 tab lets users override the URL at runtime.

| Env var | Default | Notes |
|---------|---------|-------|
| `TARGET_URL` | `https://example.com` | Default URL the cube loads. Runtime-overridable in 공유 tab. |
| `TARGET_NAME` | `Live Site` | Brand text shown in the styled "card" fallback mode. |
| `TARGET_TITLE` | `내 사이트,\n바로 입장` | Card mode hero title. |
| `TARGET_SUB` | `원하는 어떤 URL이든 큐브 안에 띄울 수 있어요.` | Card mode subline. |
| `TARGET_CHIPS` | `3D · HTML in Canvas · Vite` | Comma-separated card chips. |
| `TARGET_CTA_LABEL` | `입장` | Card mode CTA. |
| `TARGET_TAGLINE` | `3D 사이트 큐브` | Brand subline. |
| `OT_TOKEN` | _empty_ | Chrome HTML-in-Canvas Origin Trial token. |
| `BASE_PATH` | `/` | Sub-path for GitHub Pages project pages, etc. |

## 🧪 Scripts

```bash
npm run dev         # Vite dev server
npm run build       # production build → dist/
npm run preview     # preview the production build
npm run typecheck   # tsc --noEmit
npm run test        # vitest (state validation, hash codec, html-canvas adapter, tools panel)
npm run verify      # typecheck + test + build (CI gate)
```

## 🧱 Architecture

```
src/
├── main.ts
├── app/
│   ├── bootstrap.ts        wires state, scene, tools, live-canvas, banner
│   ├── state.ts            AppState + Store + localStorage + validate()
│   └── state.test.ts
├── htmlCanvas/
│   ├── adapter.ts          drawElementImage detect + <canvas layoutsubtree> source
│   ├── adapter.test.ts
│   ├── livePanel.ts        the live DOM painted onto the face
│   └── liveFace.ts         drawElementImage → CanvasTexture → cube controller
├── dice/
│   ├── scene.ts            Three.js cube + 2D iframe overlay + live-face texture swap
│   └── faceTextures.ts     per-face CanvasTexture painter (+ live preview card)
├── share/
│   ├── hash.ts             state ↔ base64url URL-hash codec (validated)
│   └── hash.test.ts
├── ui/
│   ├── tools.ts            tabs + URL input + mode pills + footer
│   ├── tools.test.ts
│   ├── banner.ts           HTML-in-Canvas status banner
│   └── toast.ts
├── util/dom.ts
└── styles/
    ├── tokens.css          design tokens (8pt rhythm, type scale, motion)
    ├── base.css            reset + reduced-motion
    ├── layout.css          2-pane shell (stage | tools)
    └── components.css      buttons, sliders, presets, mode pills
```

## ⚠️ Known limitations

- **Cross-origin popups.** A target site's `target="_blank"` links or `window.open` calls cannot be redirected back into the cube iframe — by browser security spec, cross-origin documents can't be re-targeted from outside. For same-origin targets, the app injects `<base target="_self">` on load so internal nav stays in-cube.
- **X-Frame-Options.** Sites that serve `X-Frame-Options: DENY` or strict `Content-Security-Policy: frame-ancestors` will load blank. Toggle the 공유 tab's "스타일 카드" mode to hide the empty iframe and show the WebGL face decoration instead.
- **HTML-in-Canvas is experimental & Chromium-only.** The `HTML-in-Canvas` mode needs Chromium 147+ with `chrome://flags/#canvas-draw-element`, or an Origin-Trial token (trial runs ~M148–M151, 2026; it expires). Firefox/Safari are unsupported. The iframe/card modes need none of this and work everywhere.
- **Origin Trial on a real deploy.** GitHub Pages cannot send an `Origin-Trial` response header, so the only way to enable the OT in production is the `<meta http-equiv="origin-trial">` slot — set the `OT_TOKEN` repo secret (CI injects it via `%OT_TOKEN%`) with a token registered for `https://cskwork.github.io`. Note: `*.vercel.app` is on the Public Suffix List, so no wildcard Vercel token can be issued — use a custom domain (Vercel *can* set the `Origin-Trial` response header) or register per preview URL.

## ♿ Accessibility

- All interactive elements have visible focus rings and ARIA labels.
- Keyboard navigation supported across the tools panel.
- Body contrast ≥ 4.5:1; large text ≥ 3:1.
- `prefers-reduced-motion` halts idle cube spin.
- Touch targets ≥ 44×44 px.
- Semantic HTML first (`section`, `aside`, `button`, `h1`/`h2`).

## 🧠 Design principles followed

Built against the [cskwork/web-design-10-rules](https://github.com/cskwork/web-design-10-rules) checklist — see the original repo for the full rationale behind every principle.

## 📦 License

MIT — see [LICENSE](LICENSE).

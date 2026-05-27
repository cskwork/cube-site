# Cube Site

> Render **any website** inside an interactive 3D cube. Decorate the cube with trendy "꾸미기" presets, drop stickers, imprint text, and share the whole thing — site + decoration — through a single URL hash.

A working playground for Chrome's experimental **HTML-in-Canvas Origin Trial** (`ctx.drawElement()`) combined with Three.js + CSS3DRenderer for a fully interactive iframe stitched onto a rotating cube face.

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

- **Cube IS the site.** One face of the cube is a real `<iframe>` rendered in 3D via Three.js `CSS3DRenderer`. You click buttons, scroll, type, submit forms — through the cube.
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

The original goal of this project was Chrome's [HTML element in Canvas2D Origin Trial](https://developer.chrome.com/blog/html-in-canvas-origin-trial) — `ctx.drawElement(htmlElement, x, y)`. You'll find a clean adapter at [`src/htmlCanvas/adapter.ts`](src/htmlCanvas/adapter.ts) that feature-detects `drawElement` and falls back to a hand-rolled Canvas2D card painter when the OT isn't enabled.

In practice, the **interactive demo path** uses a CSS3D-rendered `<iframe>` because users want to click buttons inside the site, which a static canvas snapshot can't deliver. Both approaches share the cube — the OT path stays available for projects that need a textured snapshot of HTML inside a WebGL canvas.

## 🌐 Live demos

- GitHub Pages (auto-deployed): `https://<your-username>.github.io/<repo-name>/`
- Vercel: `https://<your-vercel-slug>.vercel.app/`

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
npm run test        # vitest (adapter + hash encoding)
npm run verify      # typecheck + test + build (CI gate)
```

## 🧱 Architecture

```
src/
├── main.ts
├── app/
│   ├── bootstrap.ts        wires state, scene, tools
│   └── state.ts            AppState + Store + localStorage
├── htmlCanvas/
│   ├── adapter.ts          Chrome OT drawElement wrapper + fallback
│   └── adapter.test.ts
├── dice/
│   ├── scene.ts            Three.js cube + CSS3DRenderer iframe overlay
│   └── faceTextures.ts     per-face CanvasTexture painter
├── target/
│   ├── siteConfig.ts       env → runtime defaults
│   └── ...                 (legacy stubs, kept for import compat)
├── share/
│   ├── hash.ts             state ↔ base64url URL-hash codec
│   └── hash.test.ts
├── ui/
│   ├── tools.ts            tabs + URL input + footer (reset/share)
│   ├── banner.ts
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
- **Origin Trial token.** Each deploy origin needs its own token from [chromestatus.com](https://developer.chrome.com/origintrials/). The CSS3D iframe path doesn't require the OT — it's only relevant if you switch to the canvas-snapshot path.

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

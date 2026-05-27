# Contributing

Contributions welcome. Quick orientation:

- `src/dice/scene.ts` — Three.js + CSS3DRenderer setup (the cube + interactive iframe).
- `src/dice/faceTextures.ts` — per-face CanvasTexture painter (decoration / stickers / imprint).
- `src/htmlCanvas/adapter.ts` — Chrome HTML-in-Canvas Origin Trial wrapper with feature detection + fallback.
- `src/share/hash.ts` — short-key URL-hash share format.
- `src/ui/tools.ts` — decoration UI (꾸미기 / 글자 새기기 / 공유).
- `src/app/bootstrap.ts` — wires state, scene, and tools.

## Dev

```bash
npm install
cp .env.example .env
npm run dev
```

## Verify before opening a PR

```bash
npm run verify    # typecheck + tests + production build
```

## Style

- TypeScript strict mode. Run `npm run typecheck`.
- One-file = one purpose. Keep modules small.
- Korean copy first, English ok as secondary.
- Tests live next to source as `*.test.ts`.

## Filing an issue

Include:
- Browser + version
- TARGET_URL you set
- Whether HTML-in-Canvas OT flag was on
- Console error (if any)

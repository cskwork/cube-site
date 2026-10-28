# 0002. Ship HTML-in-Canvas as an opt-in mode behind a capability-gated adapter

Status: accepted (implemented in `7d1d350`)

## Context

Chrome's experimental HTML-in-Canvas API (`CanvasRenderingContext2D.drawElementImage`) can paint live DOM into a canvas, which can then become a WebGL texture. It only runs on Chromium 147+ with `chrome://flags/#canvas-draw-element`, or with an Origin-Trial token; Firefox and Safari do not have it. Its surface has already changed once (the early name was `drawElement`, see `src/env.d.ts`).

## Decision

- All calls to the API live in one file, `src/htmlCanvas/adapter.ts`. `detectMode()` probes for `drawElementImage` once and caches `"native"` or `"fallback"`; `createHtmlCanvasSource()` returns `null` when unsupported.
- The mode is a third `liveMode` value (`"html-canvas"`), never the default. The default stays the interactive iframe.
- `src/htmlCanvas/liveFace.ts` owns the canvas → `THREE.CanvasTexture` pipeline and calls `teardown()` on any exception, restoring the painted face.
- `bootstrap.ts` keeps the iframe visible when `html-canvas` is selected but `detectMode()` is not `"native"`.
- The Origin-Trial token is optional and injected at build time into `<meta http-equiv="origin-trial">` by the plugin in `vite.config.ts`.

## Consequences

- Unsupported browsers never hit the API; the mode pill is disabled with an explanation in `src/ui/stage.ts`.
- If the spec changes again, only `adapter.ts` (and the type shim in `env.d.ts`) should need edits.
- `adapter.test.ts` tests both modes by stubbing `drawElementImage` in `happy-dom`. Real rendering is not covered by automated tests.
- GitHub Pages cannot send an `Origin-Trial` header, so production relies on the meta tag and a token registered for that origin.

## Alternatives considered

- Making HTML-in-Canvas the primary path: rejected because it would break the app on every non-Chromium browser.
- Calling the API directly from the scene code: rejected so an API rename stays a one-file change.

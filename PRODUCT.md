# Product

<!-- impeccable:product-schema 1 -->

> Written unattended during the 2026-09 revamp. The owner approved the run with "권장대로 승인 진행하기" (go ahead as recommended); no interview happened.
> Facts marked **(inferred)** come from the repository and the live site and have not been confirmed by the owner.

## Platform

web

## Users

- **(inferred)** Korean-speaking web users who like 꾸미기 (decorating) culture — phone cases, diaries, photo cards — and want a playful 3D toy they can dress up and send to a friend.
- **(inferred)** Front-end developers who are curious about Chrome's HTML-in-Canvas (`drawElementImage`) origin trial and want a working demo they can fork.
- They usually land from a shared link, poke at the cube for a few minutes, decorate it, and copy a link back out. Many arrive on a phone.

## Product Purpose

Cube Site puts a real, interactive website on one face of a 3D cube. Visitors decorate the other five faces (theme presets, colour, glow, corner radius, 24 emoji stickers, per-face text imprint) and share the whole result, site URL included, through a single URL hash. Success means a visitor sees the cube, uses the site inside it, decorates it, and shares a link that reopens the identical cube.

## Positioning

A live site you can click, scroll and type into, wrapped as a decoratable 3D object. It is also an honest, capability-gated reference for the HTML-in-Canvas API: the experimental mode is only offered when the browser really supports it.

## Operating Context

- Pure static site: Vite + TypeScript + Three.js, no backend, no accounts. State lives in `localStorage` and the URL hash.
- The live face is a 2D `<iframe>` overlaid on the WebGL face while that face points at the camera. Sites that send `X-Frame-Options: DENY` or `frame-ancestors` load blank; the "스타일 카드" (style card) mode covers that case.
- Deployed to Vercel (`html-in-canvas-edu-app.vercel.app`) and GitHub Pages from `cskwork/cube-site`.

## Capabilities and Constraints

- Three live-face modes: `iframe` (default), `card` (a painted preview card), `html-canvas` (experimental; Chromium flag or Origin Trial only).
- Share links carry the decoration and target URL in a validated, compact base64url hash. `validate()` is the trust boundary for any state that comes from outside.
- Korean-first copy. English only where it is a proper name (preset names, "HTML-in-Canvas").
- No analytics, tracking, accounts or paid services.

## Brand Commitments

- Name: **Cube Site** (Korean subtitle "3D 사이트 큐브").
- Five named theme presets: Y2K Cyber, Frutiger Aero, Soft Pastel, Holographic, Bento Minimal. These are cube skins, not the app's own look.
- Honest framing of the experimental API: never claim HTML-in-Canvas is active when it is not.

## Evidence on Hand

- No testimonials, usage numbers or press. Do not invent any.
- The default target is `https://example.com` (set with `TARGET_URL`).

## Product Principles

1. The cube is the product. It should be visible and legible as a 3D object at first glance, not hidden behind the site it carries.
2. The site inside must stay fully usable: clicks, scrolls and typing work on the live face.
3. Nothing a visitor makes should be lost by accident. Decorations persist, and destructive actions can be undone.
4. Be honest about browser capability: gate features, explain why, never fake them.
5. Everything is reachable without a mouse drag: keyboard and touch have equal paths.

## Accessibility & Inclusion

- WCAG 2.2 AA contrast in light and dark colour schemes, visible focus, 44px touch targets, `prefers-reduced-motion` respected.
- Rotation must not rely on drag alone.

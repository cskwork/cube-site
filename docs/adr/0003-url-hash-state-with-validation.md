# 0003. Share state through a compact URL hash and validate every untrusted entry

Status: accepted (`7a8ea88`; validation hardened in `7d1d350` and on branch `docs/portfolio-depth`)

## Context

The app has no backend, but users need to share a decorated cube. The whole `AppState` (preset, colors, stickers, imprints, target URL, live mode) has to travel with a link, and the same state is restored from `localStorage`. Both sources can be stale, corrupted or crafted by someone else.

## Decision

- `src/share/hash.ts` encodes state as `#cube=` + base64url of JSON with one- or two-letter keys (`toShort`/`fromShort`), keeping a typical decorated cube under 2 KB (asserted in `hash.test.ts`).
- Every decode, including the legacy long format, goes through `validate()` in `src/app/state.ts`. It returns defaults for a wrong shape, clamps face indices, accepts only hex colors, backfills missing `stickers`, and accepts only `http:`/`https:` target URLs.
- Writes use `history.replaceState` and are debounced 240 ms in `bootstrap.ts`, so editing does not flood browser history.

## Consequences

- A link fully reproduces a cube without any server or account.
- Validation is the security boundary: `targetUrl` becomes `iframe.src`, and colors are interpolated into a CSS `style` string in `src/htmlCanvas/livePanel.ts`. Before the `http(s)` check, a crafted link with a `javascript:` target URL would run script in the page's origin; the test "drops a non-http(s) targetUrl…" in `src/share/hash.test.ts` covers this.
- Numeric fields (hue, glow, radius, sticker scale) are not range-checked yet.

## Alternatives considered

- Storing shares server-side behind short IDs: needs a backend, which the static-site goal rules out.
- Query parameters instead of the hash: the hash is not sent to the server, so static hosts and CDNs never see or cache user state.

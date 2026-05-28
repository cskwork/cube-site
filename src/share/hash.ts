import type { AppState, FaceState, FaceSticker, FaceImprint } from "../app/state";
import { defaultState, validate } from "../app/state";

/**
 * Compact URL-hash share format.
 *
 * Encoding:  base64url(JSON.stringify(shortened)).
 *
 * We shorten field names before encoding to keep heavy states under
 * the 2KB hash budget. The shortening is an internal detail of THIS
 * file — the rest of the app works with full-name AppState.
 */

const HASH_PREFIX = "#cube=";

interface ShortSticker { i: string; g: string; u: number; v: number; s: number; r: number }
interface ShortImprint { t: string; c: string; g: number; s: number; f: string }
interface ShortFace { c: string; s: ShortSticker[]; i?: ShortImprint }
interface ShortState {
  v: 1;
  p: AppState["preset"];
  h: number;
  g: number;
  r: number;
  a: string;
  ff: string;
  lf: number;
  sf: number;
  tu: string;
  lm: AppState["liveMode"];
  f: ShortFace[];
}

export function stateToHash(s: AppState): string {
  return HASH_PREFIX + toBase64Url(JSON.stringify(toShort(s)));
}

export function hashToState(hash: string): AppState | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const json = fromBase64Url(hash.slice(HASH_PREFIX.length));
    const parsed = JSON.parse(json) as ShortState | AppState;
    if (isShort(parsed)) return validate(fromShort(parsed));
    // Legacy long format — accept too, but route through validate() so an
    // old/corrupt bookmark can't deliver an out-of-range liveFace or a face
    // missing stickers[] straight into the render loop.
    if (parsed?.version === 1 && Array.isArray(parsed.faces) && parsed.faces.length === 6) {
      return validate(parsed as AppState);
    }
    return null;
  } catch {
    return null;
  }
}

function isShort(v: ShortState | AppState): v is ShortState {
  return (v as ShortState).v === 1 && Array.isArray((v as ShortState).f);
}

function toShort(s: AppState): ShortState {
  return {
    v: 1,
    p: s.preset,
    h: round(s.hue, 1),
    g: round(s.glow, 1000),
    r: round(s.radius, 1),
    a: s.accent,
    ff: s.fontFamily,
    lf: s.liveFace,
    sf: s.selectedFace,
    tu: s.targetUrl,
    lm: s.liveMode,
    f: s.faces.map<ShortFace>((face) => ({
      c: face.baseColor,
      s: face.stickers.map<ShortSticker>((st) => ({
        i: st.id,
        g: st.glyph,
        u: round(st.u, 1000),
        v: round(st.v, 1000),
        s: round(st.scale, 100),
        r: round(st.rotation, 10)
      })),
      ...(face.imprint
        ? {
            i: {
              t: face.imprint.text,
              c: face.imprint.color,
              g: round(face.imprint.glow, 1000),
              s: round(face.imprint.size, 1),
              f: face.imprint.fontFamily
            }
          }
        : {})
    }))
  };
}

function fromShort(s: ShortState): AppState {
  if (!Array.isArray(s.f) || s.f.length !== 6) return defaultState();
  return {
    version: 1,
    preset: s.p,
    hue: s.h,
    glow: s.g,
    radius: s.r,
    accent: s.a,
    fontFamily: s.ff,
    liveFace: s.lf as AppState["liveFace"],
    selectedFace: s.sf as AppState["selectedFace"],
    targetUrl: s.tu ?? defaultState().targetUrl,
    liveMode: (s.lm === "iframe" || s.lm === "card" || s.lm === "html-canvas") ? s.lm : "iframe",
    faces: s.f.map<FaceState>((face) => ({
      baseColor: face.c,
      stickers: (face.s ?? []).map<FaceSticker>((st) => ({
        id: st.i, glyph: st.g, u: st.u, v: st.v, scale: st.s, rotation: st.r
      })),
      imprint: face.i
        ? ({
            text: face.i.t,
            color: face.i.c,
            glow: face.i.g,
            size: face.i.s,
            fontFamily: face.i.f
          } as FaceImprint)
        : undefined
    }))
  };
}

function round(v: number, factor: number): number {
  return Math.round(v * factor) / factor;
}

export function readFromLocationHash(): AppState | null {
  if (typeof location === "undefined" || !location.hash) return null;
  return hashToState(location.hash);
}

export function writeToLocationHash(s: AppState): void {
  const h = stateToHash(s);
  // Use replaceState so the share-hash doesn't pollute history on every paint.
  if (history.replaceState) {
    history.replaceState(null, "", h);
  } else {
    location.hash = h;
  }
}

export function buildShareUrl(s: AppState): string {
  const url = new URL(location.href);
  url.hash = stateToHash(s).slice(1); // URL stores hash without leading #
  return url.toString();
}

/** Used in tests/dev to confirm encode/decode roundtrips. */
export function selftest(): boolean {
  const s = defaultState();
  const out = hashToState(stateToHash(s));
  return !!out && out.preset === s.preset && out.faces.length === 6;
}

function toBase64Url(text: string): string {
  // Browser-only — btoa is always available. unescape+encodeURIComponent
  // is the canonical "btoa with UTF-8 safe" trick.
  const b64 = btoa(unescape(encodeURIComponent(text)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(b64u: string): string {
  const padded = b64u.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (b64u.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

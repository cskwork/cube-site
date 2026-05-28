/**
 * Per-face CanvasTexture renderer.
 *
 * Each cube face owns a 1024x1024 offscreen canvas. We repaint a face only
 * when its state changes (decoration mutation, theme switch, sticker move).
 *
 * Repainting is split into pure background + decoration overlay (stickers,
 * imprint). The live face has its own painter, repaintLiveFace(): in "card"
 * mode it paints a styled site-preview card; otherwise it shows the user's
 * own decoration (visible while the iframe/html-canvas overlay is hidden
 * during rotation).
 */

import * as THREE from "three";
import type { FaceState, AppState, FaceId } from "../app/state";

const FACE_SIZE = 1024;

const FONT_STACK = '"Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif';

/**
 * The "entry zone" within the live face — only this rectangle renders the
 * iframe/CTA content and only clicks inside it count as 입장. Coordinates
 * are fractions of the face square (0..1).
 *
 * Centered horizontally, slightly below center, ~70% wide × ~28% tall.
 */
export const ENTRY_RECT = {
  x: 0.15,
  y: 0.52,
  w: 0.70,
  h: 0.28
} as const;

/** Test if a (u,v) face-local coord falls inside the entry zone. */
export function isInsideEntryRect(u: number, v: number): boolean {
  return (
    u >= ENTRY_RECT.x &&
    u <= ENTRY_RECT.x + ENTRY_RECT.w &&
    v >= ENTRY_RECT.y &&
    v <= ENTRY_RECT.y + ENTRY_RECT.h
  );
}

/** Pixel rect for a given face canvas size. */
export function entryRectPx(faceSize: number = FACE_SIZE): {
  x: number; y: number; w: number; h: number;
} {
  return {
    x: Math.round(ENTRY_RECT.x * faceSize),
    y: Math.round(ENTRY_RECT.y * faceSize),
    w: Math.round(ENTRY_RECT.w * faceSize),
    h: Math.round(ENTRY_RECT.h * faceSize)
  };
}

export interface FaceTexture {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  faceId: FaceId;
}

export function createFaceTextures(): FaceTexture[] {
  const arr: FaceTexture[] = [];
  for (let i = 0 as FaceId; i < 6; i = (i + 1) as FaceId) {
    const canvas = document.createElement("canvas");
    canvas.width = FACE_SIZE;
    canvas.height = FACE_SIZE;
    const ctx = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    arr.push({ canvas, ctx, texture, faceId: i });
  }
  return arr;
}

export interface PaintBackgroundOptions {
  appState: AppState;
  face: FaceState;
  faceId: FaceId;
  /** Whether this face is the live site face (different decoration style). */
  isLiveFace: boolean;
}

/** Paint background + decoration (no stickers, no imprint, no live HTML). */
export function paintFaceBackground(
  ft: FaceTexture,
  o: PaintBackgroundOptions
): void {
  const { ctx } = ft;
  const W = FACE_SIZE;
  const H = FACE_SIZE;
  ctx.clearRect(0, 0, W, H);

  // Outer rounded panel.
  const radius = (o.appState.radius / 40) * (W * 0.16); // map 8..40 → ~3..16% of face
  const pad = W * 0.025;
  const baseColor = o.face.baseColor;
  ctx.save();
  roundRect(ctx, pad, pad, W - 2 * pad, H - 2 * pad, radius);
  ctx.clip();

  // Base gradient.
  const baseGrad = ctx.createLinearGradient(0, 0, W, H);
  baseGrad.addColorStop(0, lighten(baseColor, 0.08));
  baseGrad.addColorStop(1, darken(baseColor, 0.12));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  // Hue-shifted accent wash.
  ctx.globalCompositeOperation = "screen";
  const hueGrad = ctx.createLinearGradient(0, H, W, 0);
  hueGrad.addColorStop(0, hsla(o.appState.hue, 80, 60, 0.18));
  hueGrad.addColorStop(1, hsla((o.appState.hue + 60) % 360, 80, 60, 0.10));
  ctx.fillStyle = hueGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // Glow ring (driven by appState.glow 0..1).
  if (o.appState.glow > 0.02) {
    const ringPad = pad + W * 0.012;
    const ringR = radius * 0.96;
    ctx.lineWidth = Math.max(2, W * 0.005 + o.appState.glow * 14);
    ctx.strokeStyle = withAlpha(o.appState.accent, 0.6);
    ctx.shadowColor = o.appState.accent;
    ctx.shadowBlur = 24 * o.appState.glow;
    roundRect(ctx, ringPad, ringPad, W - 2 * ringPad, H - 2 * ringPad, ringR);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Soft top-left highlight (aero / holo).
  if (o.appState.preset === "holo" || o.appState.preset === "aero") {
    const glare = ctx.createRadialGradient(W * 0.25, H * 0.2, 0, W * 0.25, H * 0.2, W * 0.6);
    glare.addColorStop(0, "rgba(255,255,255,0.45)");
    glare.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }

  // Holographic stripe shimmer.
  if (o.appState.preset === "holo") {
    ctx.globalAlpha = 0.18;
    for (let i = -W; i < W * 2; i += 56) {
      const stripeGrad = ctx.createLinearGradient(i, 0, i + 56, H);
      stripeGrad.addColorStop(0, "rgba(255,255,255,0.0)");
      stripeGrad.addColorStop(0.5, "rgba(255,255,255,0.8)");
      stripeGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = stripeGrad;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 24, 0);
      ctx.lineTo(i + 80, H);
      ctx.lineTo(i + 56, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Face label corner (subtle, brand detail).
  if (!o.isLiveFace) {
    ctx.fillStyle = withAlpha(o.face.baseColor === "#0b0f1a" ? "#fff" : "#0b0f1a", 0.45);
    ctx.font = `700 ${Math.round(W * 0.03)}px "Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(`face ${o.faceId + 1}`, W * 0.06, W * 0.06);
  }

  ctx.restore();

  ft.texture.needsUpdate = true;
}

/** Paint stickers + imprint on top of an already-backgrounded face. */
export function paintFaceOverlay(ft: FaceTexture, face: FaceState): void {
  const { ctx } = ft;
  const W = FACE_SIZE;

  if (face.imprint?.text) {
    const im = face.imprint;
    ctx.save();
    ctx.shadowColor = im.color;
    ctx.shadowBlur = 12 + im.glow * 36;
    ctx.fillStyle = im.color;
    const px = Math.round(W * (im.size / 256));
    ctx.font = `800 ${px}px ${im.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(im.text, W / 2, W / 2);
    ctx.restore();
  }

  for (const s of face.stickers) {
    ctx.save();
    const x = s.u * W;
    const y = s.v * W;
    ctx.translate(x, y);
    ctx.rotate((s.rotation * Math.PI) / 180);
    const size = W * 0.18 * s.scale;
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.glyph, 0, 0);
    ctx.restore();
  }

  ft.texture.needsUpdate = true;
}

export function repaintFace(
  ft: FaceTexture,
  appState: AppState,
  face: FaceState,
  isLiveFace: boolean
): void {
  paintFaceBackground(ft, { appState, face, faceId: ft.faceId, isLiveFace });
  if (!isLiveFace) {
    paintFaceOverlay(ft, face);
  }
}

/**
 * Repaint the live (entry) face. In "card" mode this paints a styled
 * site-preview card so the face is never bare; in "iframe"/"html-canvas"
 * mode the overlay covers it when active, so we paint the user's own
 * decoration to show through during rotation.
 */
export function repaintLiveFace(
  ft: FaceTexture,
  appState: AppState,
  face: FaceState
): void {
  paintFaceBackground(ft, { appState, face, faceId: ft.faceId, isLiveFace: true });
  if (appState.liveMode === "card") {
    paintLiveCard(ft, appState);
  } else {
    paintFaceOverlay(ft, face);
  }
}

/**
 * Paint a browser-window-style preview card representing the live target
 * site, on top of the already-painted themed panel. Used by "card" mode so
 * the live face shows something meaningful when the real iframe is hidden
 * (e.g. the site sends X-Frame-Options: DENY).
 */
export function paintLiveCard(ft: FaceTexture, appState: AppState): void {
  const { ctx } = ft;
  const W = FACE_SIZE;
  const accent = appState.accent;

  let host = appState.targetUrl;
  try {
    host = new URL(appState.targetUrl).hostname.replace(/^www\./, "") || appState.targetUrl;
  } catch {
    /* keep raw string */
  }

  // ---- inner card ----
  const cx = W * 0.12, cy = W * 0.17, cw = W * 0.76, ch = W * 0.66;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = W * 0.045;
  ctx.shadowOffsetY = W * 0.012;
  ctx.fillStyle = "rgba(12,15,26,0.84)";
  roundRect(ctx, cx, cy, cw, ch, W * 0.045);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // ---- title bar: traffic lights + address pill ----
  const barH = ch * 0.15;
  const dotR = barH * 0.13;
  const dotY = cy + barH * 0.5;
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c;
    circle(ctx, cx + cw * 0.06 + i * dotR * 3, dotY, dotR);
  });
  const pillX = cx + cw * 0.28, pillW = cw * 0.64;
  const pillH = barH * 0.5, pillY = dotY - pillH / 2;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = "rgba(231,233,242,0.92)";
  ctx.font = `500 ${Math.round(barH * 0.34)}px ${FONT_STACK}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(truncate(host, 30), pillX + pillW * 0.06, dotY);

  // ---- divider ----
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = Math.max(1, W * 0.0015);
  ctx.beginPath();
  ctx.moveTo(cx, cy + barH);
  ctx.lineTo(cx + cw, cy + barH);
  ctx.stroke();

  // ---- body: headline + host line ----
  const bodyX = cx + cw * 0.08;
  ctx.fillStyle = "#f7f8ff";
  ctx.font = `800 ${Math.round(ch * 0.13)}px ${FONT_STACK}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("라이브 사이트", bodyX, cy + barH + ch * 0.28);
  ctx.fillStyle = "rgba(200,205,242,0.85)";
  ctx.font = `500 ${Math.round(ch * 0.075)}px ${FONT_STACK}`;
  ctx.fillText(truncate(host, 34), bodyX, cy + barH + ch * 0.45);

  // ---- CTA pill ----
  const ctaW = cw * 0.46, ctaH = ch * 0.16;
  const ctaX = bodyX, ctaY = cy + ch * 0.72;
  const g = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
  g.addColorStop(0, accent);
  g.addColorStop(1, lighten(accent, 0.22));
  ctx.fillStyle = g;
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.fillStyle = "#0b0f1a";
  ctx.font = `800 ${Math.round(ctaH * 0.42)}px ${FONT_STACK}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("입장 →", ctaX + ctaW * 0.16, ctaY + ctaH / 2);

  ctx.restore();
  ft.texture.needsUpdate = true;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ---------- color helpers ----------
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function lighten(hex: string, t: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: Math.min(255, r + (255 - r) * t), g: Math.min(255, g + (255 - g) * t), b: Math.min(255, b + (255 - b) * t) });
}
function darken(hex: string, t: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * (1 - t), g: g * (1 - t), b: b * (1 - t) });
}
function withAlpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}
function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${h},${s}%,${l}%,${a})`;
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const v = (1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  return "#" + v.toString(16).slice(1);
}

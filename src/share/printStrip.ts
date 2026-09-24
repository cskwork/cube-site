/**
 * 네컷 출력 — a four-frame photo-booth strip of the decorated cube.
 *
 * The cube is rendered from four camera angles and composed onto a white
 * 2x6-inch strip (600x1800 px). The live site cannot be captured (it is a
 * cross-origin iframe), so the live face shows its painted WebGL face,
 * which is what the cube really looks like with the site switched off.
 */

import type { AppState } from "../app/state";
import { frontOf, orbit, overviewOf, type Vec3 } from "../dice/views";

export const STRIP = {
  width: 600,
  height: 1800,
  margin: 36,
  gap: 24,
  footer: 196
} as const;

export interface FrameRect { x: number; y: number; w: number; h: number }

/** Four stacked frames filling the strip above the footer band. */
export function stripLayout(): FrameRect[] {
  const { width, height, margin, gap, footer } = STRIP;
  const w = width - margin * 2;
  const h = Math.floor((height - margin - footer - gap * 3) / 4);
  return Array.from({ length: 4 }, (_, i) => ({ x: margin, y: margin + i * (h + gap), w, h }));
}

/** The four angles of the strip: the live face, both shoulders, and from above. */
export function stripAngles(liveFace: number, distance = 3.9): Vec3[] {
  const over = overviewOf(liveFace, distance * 0.8);
  return [
    frontOf(liveFace, distance * 1.05),
    over,
    orbit(over, Math.PI * 0.62, 0),
    orbit(overviewOf(liveFace, distance * 0.8), Math.PI * 1.1, -0.5)
  ];
}

export function stripFileName(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `cube-site-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.png`;
}

export function stampText(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

const INK = "#0e1330";
const BACKDROP = "#e9ebf2";
const DISPLAY = '"Do Hyeon", "Apple SD Gothic Neo", system-ui, sans-serif';
const BODY = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

export type CaptureFn = (positions: Vec3[], w: number, h: number) => HTMLCanvasElement[];

/** Compose the strip onto a canvas. Throws if the browser cannot provide a 2D context. */
export async function composeStrip(state: AppState, capture: CaptureFn, now = new Date()): Promise<HTMLCanvasElement> {
  try {
    await document.fonts?.load(`64px ${DISPLAY}`);
  } catch {
    /* fall back to the system face */
  }
  const frames = stripLayout();
  const shots = capture(stripAngles(state.liveFace), frames[0].w, frames[0].h);

  const c = document.createElement("canvas");
  c.width = STRIP.width;
  c.height = STRIP.height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);

  frames.forEach((f, i) => {
    ctx.fillStyle = BACKDROP;
    roundRect(ctx, f.x, f.y, f.w, f.h, 14);
    ctx.fill();
    // Soft floor light, like a booth's backdrop sweep.
    const g = ctx.createRadialGradient(f.x + f.w / 2, f.y + f.h * 0.95, 10, f.x + f.w / 2, f.y + f.h * 0.95, f.w * 0.7);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    roundRect(ctx, f.x, f.y, f.w, f.h, 14);
    ctx.clip();
    if (shots[i]) ctx.drawImage(shots[i], f.x, f.y, f.w, f.h);
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    roundRect(ctx, f.x, f.y, f.w, f.h, 14);
    ctx.stroke();
  });

  const fy = STRIP.height - STRIP.footer;
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  ctx.font = `72px ${DISPLAY}`;
  ctx.fillText("Cube Site", STRIP.margin, fy + 92);
  ctx.font = `600 22px ${BODY}`;
  ctx.fillText(hostOf(state.targetUrl).slice(0, 34), STRIP.margin, fy + 132);
  ctx.font = `500 20px ${BODY}`;
  ctx.fillStyle = "#464c6e";
  ctx.fillText(stampText(now), STRIP.margin, fy + 162);
  ctx.textAlign = "right";
  ctx.font = `40px ${DISPLAY}`;
  ctx.fillStyle = "#2340ff";
  ctx.fillText("네컷", STRIP.width - STRIP.margin, fy + 92);
  ctx.textAlign = "left";

  return c;
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * htmlCanvasAdapter
 * ------------------------------------------------------------------
 * Stable internal wrapper around Chrome's HTML-element-in-Canvas2D
 * origin trial (https://developer.chrome.com/blog/html-in-canvas-origin-trial).
 *
 * Why a wrapper:
 *   The API is experimental — surface may shift across OT iterations.
 *   We expose one named function (drawHTMLOntoCanvas) that callers
 *   use; if the API moves, only this file changes.
 *
 * Surface:
 *   detectMode()     → "native" | "fallback"
 *   drawHTMLOntoCanvas(ctx, el, opts) → boolean (true if real, false if drawn fallback)
 *   waitForElementReady(el)            → Promise<void> (lets layout settle)
 *
 * Fallback:
 *   The fallback path paints a soft "snapshot card" representation
 *   so the dice face never goes blank. It's intentionally NOT
 *   html2canvas — that lib is 100+ KB. We keep zero deps.
 */

export type AdapterMode = "native" | "fallback";

interface CanvasCtxMaybeDraw extends CanvasRenderingContext2D {
  drawElement?: (element: Element, x: number, y: number) => void;
}

let _cachedMode: AdapterMode | null = null;

/**
 * Detect once whether `CanvasRenderingContext2D.prototype.drawElement`
 * is present. Cached for the session.
 */
export function detectMode(): AdapterMode {
  if (_cachedMode !== null) return _cachedMode;
  if (typeof window === "undefined" || typeof document === "undefined") {
    _cachedMode = "fallback";
    return _cachedMode;
  }
  try {
    const probe = document.createElement("canvas").getContext("2d") as CanvasCtxMaybeDraw | null;
    const hasFn = !!(probe && typeof probe.drawElement === "function");
    _cachedMode = hasFn ? "native" : "fallback";
  } catch {
    _cachedMode = "fallback";
  }
  return _cachedMode;
}

/** For tests — never call from app code. */
export function __resetModeCacheForTests(forced?: AdapterMode | null): void {
  _cachedMode = forced ?? null;
}

export interface DrawOptions {
  /** Top-left of paint area on the target canvas, in CSS pixels. */
  x: number;
  y: number;
  /** Box used for the fallback paint. The native path uses the element's own layout box. */
  width: number;
  height: number;
  /** Optional label rendered on the fallback card. */
  fallbackLabel?: string;
  /** Optional accent color for the fallback. */
  fallbackAccent?: string;
}

/**
 * Paint a live HTML element onto a 2D canvas context.
 * Returns true if the native OT path executed; false if fallback was used.
 *
 * The element MUST be in the DOM (off-screen is fine) and rendered for
 * native drawElement to work — see waitForElementReady().
 */
export function drawHTMLOntoCanvas(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  opts: DrawOptions
): boolean {
  if (detectMode() === "native") {
    try {
      const c = ctx as CanvasCtxMaybeDraw;
      c.drawElement!(element, opts.x, opts.y);
      return true;
    } catch (e) {
      console.warn("[htmlCanvas] native drawElement threw; falling back.", e);
      _cachedMode = "fallback";
    }
  }
  drawFallback(ctx, opts);
  return false;
}

/**
 * Soft fallback: paints a representative "snapshot card" so the
 * dice face never goes blank for non-OT browsers.
 */
function drawFallback(ctx: CanvasRenderingContext2D, o: DrawOptions): void {
  const { x, y, width: w, height: h } = o;
  ctx.save();
  // background card
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#1b2238");
  grad.addColorStop(1, "#0b0f1a");
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, Math.min(24, h * 0.06));
  ctx.fill();
  // accent ring
  ctx.strokeStyle = o.fallbackAccent ?? "#a78bfa";
  ctx.lineWidth = Math.max(2, h * 0.008);
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, Math.min(22, h * 0.055));
  ctx.stroke();
  // headline
  ctx.fillStyle = "#f7f8ff";
  ctx.font = `700 ${Math.round(h * 0.10)}px "Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText("라이브 사이트 미리보기", x + w * 0.08, y + h * 0.12);
  // subline
  ctx.fillStyle = "#c8cdf2";
  ctx.font = `500 ${Math.round(h * 0.055)}px "Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif`;
  ctx.fillText(o.fallbackLabel ?? "Chrome 플래그를 켜면 실시간 미리보기로 바뀌어요.", x + w * 0.08, y + h * 0.26);
  // mock CTA
  const ctaX = x + w * 0.08;
  const ctaY = y + h * 0.6;
  const ctaW = w * 0.42;
  const ctaH = h * 0.18;
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
  ctaGrad.addColorStop(0, "#a78bfa");
  ctaGrad.addColorStop(1, "#22d3ee");
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.fillStyle = "#0b0f1a";
  ctx.font = `800 ${Math.round(ctaH * 0.42)}px "Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("입장 →", ctaX + ctaW * 0.14, ctaY + ctaH / 2);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  const radius = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Wait two animation frames so layout / fonts settle before drawElement.
 * Native drawElement reads the element's current visual state.
 */
export function waitForElementReady(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Read the configured Origin Trial token from the document. Empty string
 * means the build was made without OT_TOKEN env var — that is fine for
 * local dev where Chrome flag (#enable-experimental-web-platform-features)
 * can substitute for an OT meta.
 */
export function readOriginTrialToken(): string {
  if (typeof document === "undefined") return "";
  const meta = document.getElementById("ot-meta") as HTMLMetaElement | null;
  return meta?.content?.trim() ?? "";
}

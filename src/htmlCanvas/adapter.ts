/**
 * htmlCanvasAdapter
 * ------------------------------------------------------------------
 * Stable internal wrapper around Chrome's "HTML in Canvas" feature
 * (WICG html-in-canvas, shipped behind an Origin Trial / the
 * chrome://flags/#canvas-draw-element flag).
 *
 * The live API is `CanvasRenderingContext2D.drawElementImage(el, dx, dy)`
 * (returns a DOMMatrix) — NOT the early `drawElement(el, x, y)` name.
 * The element being drawn must be a DIRECT CHILD of a `<canvas layoutsubtree>`,
 * and paints are demand-driven via `canvas.requestPaint()` + `canvas.onpaint`.
 *
 * Why a wrapper:
 *   The API is experimental — surface may shift across OT iterations.
 *   Callers use detectMode() to gate UI and createHtmlCanvasSource() to get
 *   a paintable canvas; if the spec moves, only this file changes.
 *
 * Browser reality (2026): Chromium 147+ with the flag, or Chrome 148–151
 * with an Origin-Trial token. Never Firefox/Safari. So this path is always
 * opt-in and capability-gated; non-supporting browsers use the iframe/card
 * live modes instead.
 */

export type AdapterMode = "native" | "fallback";

interface Ctx2DMaybe extends CanvasRenderingContext2D {
  drawElementImage?: (el: Element, dx: number, dy: number, dw?: number, dh?: number) => DOMMatrix;
}
interface CanvasMaybePaint extends HTMLCanvasElement {
  requestPaint?: () => void;
  onpaint?: ((this: HTMLCanvasElement, ev: Event) => unknown) | null;
}

let _cachedMode: AdapterMode | null = null;

/**
 * Detect once whether `CanvasRenderingContext2D.prototype.drawElementImage`
 * is available. Cached for the session.
 */
export function detectMode(): AdapterMode {
  if (_cachedMode !== null) return _cachedMode;
  if (typeof window === "undefined" || typeof document === "undefined") {
    _cachedMode = "fallback";
    return _cachedMode;
  }
  try {
    const probe = document.createElement("canvas").getContext("2d") as Ctx2DMaybe | null;
    _cachedMode = probe && typeof probe.drawElementImage === "function" ? "native" : "fallback";
  } catch {
    _cachedMode = "fallback";
  }
  return _cachedMode;
}

/** For tests — never call from app code. */
export function __resetModeCacheForTests(forced?: AdapterMode | null): void {
  _cachedMode = forced ?? null;
}

export interface CreateSourceOptions {
  /** CSS-pixel width of the panel / drawn region. */
  width: number;
  /** CSS-pixel height of the panel / drawn region. */
  height: number;
  /** Device pixel ratio for crispness (default 1). */
  dpr?: number;
  /** Called after each successful drawElementImage paint. */
  onPaint?: () => void;
}

export interface HtmlCanvasSource {
  /** The layoutsubtree canvas — also the 2D paint target. Use as a texture source. */
  canvas: HTMLCanvasElement;
  /** The direct-child element to populate with live HTML. */
  panel: HTMLElement;
  /** Request a fresh paint of the panel into the canvas. */
  repaint(): void;
  /** Remove the canvas from the DOM and detach handlers. */
  dispose(): void;
}

/**
 * Create a hidden `<canvas layoutsubtree>` whose direct child (`panel`) is
 * painted into the canvas via drawElementImage. Returns null when the API is
 * unavailable so callers can fall back without try/catch.
 *
 * Spec notes honored here:
 *   - canvas carries the `layoutsubtree` attribute
 *   - the drawn element is a DIRECT child of the canvas
 *   - the canvas is NOT display:none (that would strip the child's boxes);
 *     it is positioned off-screen and made transparent instead
 */
export function createHtmlCanvasSource(opts: CreateSourceOptions): HtmlCanvasSource | null {
  if (detectMode() !== "native" || typeof document === "undefined") return null;

  const dpr = Math.max(1, opts.dpr ?? 1);
  const { width, height } = opts;

  const canvas = document.createElement("canvas") as CanvasMaybePaint;
  canvas.setAttribute("layoutsubtree", "");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  Object.assign(canvas.style, {
    position: "fixed",
    left: "0px",
    top: "0px",
    width: `${width}px`,
    height: `${height}px`,
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1"
  } satisfies Partial<CSSStyleDeclaration>);

  const panel = document.createElement("div");
  panel.style.width = `${width}px`;
  panel.style.height = `${height}px`;
  canvas.appendChild(panel); // MUST be a direct child of the canvas
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d") as Ctx2DMaybe | null;

  function paint(): void {
    if (!ctx || typeof ctx.drawElementImage !== "function") return;
    try {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // map CSS px → device px
      ctx.clearRect(0, 0, width, height);
      ctx.drawElementImage(panel, 0, 0);
      opts.onPaint?.();
    } catch (e) {
      console.warn("[htmlCanvas] drawElementImage failed; live-canvas paint skipped.", e);
    }
  }

  canvas.onpaint = () => paint();

  function repaint(): void {
    if (typeof canvas.requestPaint === "function") canvas.requestPaint();
    else paint(); // no requestPaint() → paint synchronously
  }
  repaint(); // first frame

  function dispose(): void {
    canvas.onpaint = null;
    canvas.remove();
  }

  return { canvas, panel, repaint, dispose };
}

/**
 * Read the configured Origin Trial token from the document. Empty string
 * means the build was made without OT_TOKEN — fine for local dev where the
 * chrome://flags/#canvas-draw-element flag substitutes for an OT meta.
 */
export function readOriginTrialToken(): string {
  if (typeof document === "undefined") return "";
  const meta = document.getElementById("ot-meta") as HTMLMetaElement | null;
  return meta?.content?.trim() ?? "";
}

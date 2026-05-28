/// <reference types="vite/client" />

declare const __OT_TOKEN__: string;
declare const __APP_VERSION__: string;
declare const __TARGET_SITE__: {
  url: string;
  name: string;
  title: string;
  sub: string;
  chips: string;
  ctaLabel: string;
  tagline: string;
};

// Chrome "HTML in Canvas" (WICG html-in-canvas). The shipped Origin-Trial
// surface is drawElementImage(...) returning a DOMMatrix — NOT the early
// drawElement(el,x,y) name. The element must be a direct child of a
// <canvas layoutsubtree>; paints are demand-driven via requestPaint()/onpaint.
// https://wicg.github.io/html-in-canvas/
interface CanvasRenderingContext2D {
  drawElementImage?: (
    element: Element,
    dx: number,
    dy: number,
    dw?: number,
    dh?: number
  ) => DOMMatrix;
}

interface HTMLCanvasElement {
  /** Schedule a paint of the canvas layout-subtree children. */
  requestPaint?: () => void;
  /** Fires when a layout-subtree child's rendering changes. */
  onpaint?: ((this: HTMLCanvasElement, ev: Event) => unknown) | null;
}

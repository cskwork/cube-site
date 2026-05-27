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

interface CanvasRenderingContext2D {
  // Chrome Origin Trial: HTML element in Canvas2D.
  // https://developer.chrome.com/blog/html-in-canvas-origin-trial
  drawElement?: (element: Element, x: number, y: number) => void;
}

interface HTMLCanvasElement {
  drawElement?: (element: Element, x: number, y: number) => void;
}

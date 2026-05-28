import { describe, it, expect, beforeEach } from "vitest";
import {
  detectMode,
  createHtmlCanvasSource,
  __resetModeCacheForTests,
  readOriginTrialToken
} from "./adapter";

/**
 * happy-dom does not implement Canvas2D or the experimental
 * drawElementImage API, so we patch getContext to return a stub that
 * records the calls the adapter makes.
 */
function patchContext(withApi: boolean): { drawCalls: number } {
  const state = { drawCalls: 0 };
  const stub: Record<string, unknown> = {
    setTransform: () => {},
    clearRect: () => {},
    reset: () => {}
  };
  if (withApi) {
    stub.drawElementImage = () => {
      state.drawCalls++;
      return {} as DOMMatrix;
    };
  }
  HTMLCanvasElement.prototype.getContext = function (kind: string) {
    return kind === "2d" ? (stub as unknown as CanvasRenderingContext2D) : null;
  } as HTMLCanvasElement["getContext"];
  return {
    get drawCalls() { return state.drawCalls; }
  } as { drawCalls: number };
}

describe("htmlCanvasAdapter", () => {
  beforeEach(() => __resetModeCacheForTests(null));

  it("detects fallback when drawElementImage is absent", () => {
    patchContext(false);
    expect(detectMode()).toBe("fallback");
  });

  it("detects native when drawElementImage is present on the 2d context", () => {
    patchContext(true);
    expect(detectMode()).toBe("native");
  });

  it("createHtmlCanvasSource returns null when the API is unavailable", () => {
    patchContext(false);
    expect(createHtmlCanvasSource({ width: 256, height: 256 })).toBeNull();
  });

  it("createHtmlCanvasSource builds a layoutsubtree canvas with the panel as a direct child", () => {
    const calls = patchContext(true);
    const src = createHtmlCanvasSource({ width: 256, height: 128, dpr: 2 });
    expect(src).not.toBeNull();
    expect(src!.canvas.hasAttribute("layoutsubtree")).toBe(true);
    expect(src!.panel.parentElement).toBe(src!.canvas); // direct child per spec
    expect(src!.canvas.width).toBe(512);  // 256 * dpr 2
    expect(src!.canvas.height).toBe(256); // 128 * dpr 2
    expect(calls.drawCalls).toBeGreaterThan(0); // painted on creation
    expect(document.body.contains(src!.canvas)).toBe(true);
    src!.dispose();
    expect(document.body.contains(src!.canvas)).toBe(false);
  });

  it("fires the onPaint callback after a paint", () => {
    patchContext(true);
    let painted = 0;
    const src = createHtmlCanvasSource({ width: 64, height: 64, onPaint: () => { painted++; } });
    expect(painted).toBeGreaterThan(0);
    src!.repaint();
    expect(painted).toBeGreaterThan(1);
    src!.dispose();
  });

  it("readOriginTrialToken returns the meta content or empty string", () => {
    const meta = document.createElement("meta");
    meta.id = "ot-meta";
    meta.setAttribute("http-equiv", "origin-trial");
    meta.setAttribute("content", "  TOKEN-ABC  ");
    document.head.appendChild(meta);
    expect(readOriginTrialToken()).toBe("TOKEN-ABC");
    meta.remove();
    expect(readOriginTrialToken()).toBe("");
  });
});

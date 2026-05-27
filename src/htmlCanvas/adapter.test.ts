import { describe, it, expect, beforeEach } from "vitest";
import {
  detectMode,
  drawHTMLOntoCanvas,
  __resetModeCacheForTests,
  readOriginTrialToken
} from "./adapter";

/**
 * happy-dom does not implement CanvasRenderingContext2D, so we mint
 * a hand-rolled fake that records the calls the adapter makes. The
 * adapter only cares about: drawElement (native path) OR the basic
 * 2d drawing methods (fallback path).
 */
function makeFakeCtx(withDrawElement: boolean): {
  ctx: CanvasRenderingContext2D;
  readonly drawElementCalls: number;
  readonly fillCalls: number;
  readonly fillTextCalls: number;
  throwOnDraw: boolean;
} {
  const state = { drawElementCalls: 0, fillCalls: 0, fillTextCalls: 0, throwOnDraw: false };
  const stub: Record<string, unknown> = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    fillRect: () => { state.fillCalls++; },
    fillText: () => { state.fillTextCalls++; },
    stroke: () => {},
    fill: () => { state.fillCalls++; },
    clip: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    translate: () => {},
    rotate: () => {},
    set fillStyle(_v: unknown) {},
    set strokeStyle(_v: unknown) {},
    set lineWidth(_v: unknown) {},
    set font(_v: unknown) {},
    set textAlign(_v: unknown) {},
    set textBaseline(_v: unknown) {},
    set shadowColor(_v: unknown) {},
    set shadowBlur(_v: unknown) {},
    set globalAlpha(_v: unknown) {},
    set globalCompositeOperation(_v: unknown) {}
  };
  if (withDrawElement) {
    stub.drawElement = () => {
      state.drawElementCalls++;
      if (state.throwOnDraw) throw new Error("boom");
    };
  }
  // Patch getContext so detectMode() can probe a canvas.
  HTMLCanvasElement.prototype.getContext = function (kind: string) {
    if (kind !== "2d") return null;
    return stub as unknown as CanvasRenderingContext2D;
  } as HTMLCanvasElement["getContext"];
  return {
    ctx: stub as unknown as CanvasRenderingContext2D,
    get drawElementCalls() { return state.drawElementCalls; },
    get fillCalls() { return state.fillCalls; },
    get fillTextCalls() { return state.fillTextCalls; },
    set throwOnDraw(v: boolean) { state.throwOnDraw = v; },
    get throwOnDraw() { return state.throwOnDraw; }
  };
}

describe("htmlCanvasAdapter", () => {
  beforeEach(() => __resetModeCacheForTests(null));

  it("detects fallback when drawElement is absent", () => {
    makeFakeCtx(false);
    expect(detectMode()).toBe("fallback");
  });

  it("detects native when drawElement is present on the 2d context", () => {
    makeFakeCtx(true);
    expect(detectMode()).toBe("native");
  });

  it("drawHTMLOntoCanvas returns true when native path runs", () => {
    const fx = makeFakeCtx(true);
    __resetModeCacheForTests("native");
    const el = document.createElement("div");
    document.body.appendChild(el);
    const native = drawHTMLOntoCanvas(fx.ctx, el, { x: 0, y: 0, width: 100, height: 100 });
    expect(native).toBe(true);
    expect(fx.drawElementCalls).toBe(1);
    el.remove();
  });

  it("drawHTMLOntoCanvas paints fallback and returns false when native is unavailable", () => {
    const fx = makeFakeCtx(false);
    __resetModeCacheForTests("fallback");
    const el = document.createElement("div");
    document.body.appendChild(el);
    const native = drawHTMLOntoCanvas(fx.ctx, el, {
      x: 0, y: 0, width: 200, height: 120,
      fallbackLabel: "테스트"
    });
    expect(native).toBe(false);
    expect(fx.fillCalls).toBeGreaterThan(0);
    expect(fx.fillTextCalls).toBeGreaterThan(0);
    el.remove();
  });

  it("downgrades to fallback if native call throws", () => {
    const fx = makeFakeCtx(true);
    fx.throwOnDraw = true;
    __resetModeCacheForTests("native");
    const el = document.createElement("div");
    document.body.appendChild(el);
    const native = drawHTMLOntoCanvas(fx.ctx, el, { x: 0, y: 0, width: 100, height: 100 });
    expect(native).toBe(false);
    expect(detectMode()).toBe("fallback");
    el.remove();
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

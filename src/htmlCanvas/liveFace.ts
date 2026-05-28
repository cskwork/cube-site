/**
 * Live-face controller for the experimental HTML-in-Canvas mode.
 *
 * Owns the lifecycle of the drawElementImage → CanvasTexture → cube-face
 * pipeline and reconciles it against app state. Everything is wrapped so a
 * failure anywhere downgrades cleanly (teardown) instead of breaking the
 * page — the mode is opt-in and capability-gated, so a clean fallback to
 * iframe/card is always acceptable.
 */

import * as THREE from "three";
import type { AppState, Store } from "../app/state";
import type { SceneHandles } from "../dice/scene";
import { createHtmlCanvasSource, detectMode, type HtmlCanvasSource } from "./adapter";
import { renderLivePanel, tickLivePanel } from "./livePanel";

const PANEL_PX = 1024; // matches the per-face texture resolution

export interface LiveFaceController {
  /** Bring the live texture in sync with current state. */
  reconcile(): void;
  /** Tear everything down (also the public dispose). */
  dispose(): void;
}

export function createLiveFaceController(store: Store, scene: SceneHandles): LiveFaceController {
  let source: HtmlCanvasSource | null = null;
  let texture: THREE.CanvasTexture | null = null;
  let timer: number | undefined;
  let lastLiveFace = -1;
  let active = false;

  function startClock(): void {
    stopClock();
    timer = window.setInterval(() => {
      if (!source || document.hidden) return; // don't repaint a backgrounded tab
      tickLivePanel(source.panel);
      source.repaint();
    }, 1000);
  }
  function stopClock(): void {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  function teardown(): void {
    stopClock();
    try { scene.setLiveFaceTexture(null); } catch { /* scene already disposed */ }
    if (texture) { texture.dispose(); texture = null; }
    if (source) { source.dispose(); source = null; }
    active = false;
    lastLiveFace = -1;
  }

  function setup(s: AppState): void {
    try {
      const src = createHtmlCanvasSource({
        width: PANEL_PX,
        height: PANEL_PX,
        dpr: 1,
        onPaint: () => { if (texture) texture.needsUpdate = true; }
      });
      if (!src) return; // unsupported — stay torn down
      source = src;
      renderLivePanel(src.panel, s);
      const tex = new THREE.CanvasTexture(src.canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      texture = tex;
      scene.setLiveFaceTexture(tex);
      src.repaint();
      startClock();
      active = true;
      lastLiveFace = s.liveFace;
    } catch (e) {
      console.warn("[htmlCanvas] live-face setup failed; falling back.", e);
      teardown();
    }
  }

  function reconcile(): void {
    const s = store.get();
    const want = s.liveMode === "html-canvas" && detectMode() === "native";
    if (want && !active) { setup(s); return; }
    if (!want && active) { teardown(); return; }
    if (want && active && source && texture) {
      try {
        if (s.liveFace !== lastLiveFace) {
          scene.setLiveFaceTexture(texture); // re-apply to the newly-selected live face
          lastLiveFace = s.liveFace;
        }
        renderLivePanel(source.panel, s);
        source.repaint();
      } catch (e) {
        console.warn("[htmlCanvas] live-face update failed; falling back.", e);
        teardown();
      }
    }
  }

  return { reconcile, dispose: teardown };
}

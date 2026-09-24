/**
 * App bootstrap — wires state, scene, and the tools panel.
 *
 * Two regions fill the screen: the 3D cube stage (with an interactive
 * <iframe> overlaid on the live face) and the decoration tools panel.
 * No header, no hero, no footer, no separate enter button — the cube
 * IS the site, the iframe IS the entry surface.
 */

import {
  defaultState, loadFromStorage, saveToStorage,
  Store, type FaceId, type AppState
} from "./state";
import { readFromLocationHash, writeToLocationHash } from "../share/hash";
import { createFaceTextures, repaintFace, repaintLiveFace } from "../dice/faceTextures";
import { createScene } from "../dice/scene";
import { el, on, debounce } from "../util/dom";
import { createTools } from "../ui/tools";
import { detectMode } from "../htmlCanvas/adapter";
import { History } from "./history";
import { createStageChrome } from "../ui/stage";
import { createLiveFaceController } from "../htmlCanvas/liveFace";

export function bootstrap(root: HTMLElement): void {
  const initial = readFromLocationHash() ?? loadFromStorage() ?? defaultState();
  const store = new Store(initial);

  const shell = el("div", { class: "app-shell" });
  root.appendChild(shell);

  const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;
  const chrome = createStageChrome(store, { coachArt: asset("img/coach.webp") });
  const viewfinder = el("div", { class: "viewfinder" });
  const stage = el("section", { class: "app-stage", "aria-label": "3D 사이트 큐브" }, [
    chrome.bar, viewfinder, chrome.keys
  ]);
  shell.appendChild(stage);

  const faces = createFaceTextures();
  const scene = createScene(viewfinder, faces, initial.liveFace, initial.targetUrl);

  // Experimental HTML-in-Canvas live face (drawElementImage → CanvasTexture).
  // Opt-in + capability-gated; controller is a no-op on unsupported browsers.
  const liveCanvas = createLiveFaceController(store, scene);

  // Show the real iframe for "iframe" mode, and also as the graceful fallback
  // when "html-canvas" is requested but the browser can't run it.
  const wantIframe = (s: AppState): boolean =>
    s.liveMode === "iframe" ||
    (s.liveMode === "html-canvas" && detectMode() !== "native");

  scene.setIframeVisible(wantIframe(initial));
  liveCanvas.reconcile();

  chrome.attach(scene, viewfinder);

  // First look: start on the shoulder so the cube reads as a cube, then turn
  // to face the site. Reduced-motion users land on the front view directly.
  scene.setView("overview", { animate: false });
  window.setTimeout(() => scene.setView("front", { durationMs: 900 }), 700);

  const history = new History(store);
  const tools = createTools(store, {
    history,
    print: { capture: scene.captureViews, emptyArt: asset("img/print-empty.webp") }
  });
  shell.appendChild(tools.root);

  // Undo / redo shortcuts. Text fields keep their native undo.
  on(document, "keydown", (ev) => {
    const e = ev as KeyboardEvent;
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || (t.tagName === "INPUT" && !["range", "color", "button"].includes((t as HTMLInputElement).type)) || t.tagName === "TEXTAREA")) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { if (history.undo()) e.preventDefault(); }
    else if ((k === "z" && e.shiftKey) || k === "y") { if (history.redo()) e.preventDefault(); }
  });

  // ---------- repaint pipeline ----------
  // Every face (including the live one) gets its decoration painted onto
  // the WebGL face. The iframe overlays the live face when liveMode is
  // "iframe"; in "card" mode the WebGL face shows through.
  let lastState = store.get();
  function repaintAll(force = false): void {
    const s = store.get();
    const themeDelta = themeChanged(lastState, s);
    const urlDelta = s.targetUrl !== lastState.targetUrl; // live card shows the URL
    for (let i = 0 as FaceId; i < 6; i = (i + 1) as FaceId) {
      const isLive = i === s.liveFace;
      const changed = force || lastState.faces[i] !== s.faces[i] || themeDelta || (isLive && urlDelta);
      if (!changed) continue;
      if (isLive) repaintLiveFace(faces[i], s, s.faces[i]);
      else repaintFace(faces[i], s, s.faces[i], false);
    }
    lastState = s;
  }
  repaintAll(true);

  // ---------- runtime field syncing ----------
  store.subscribe(() => {
    const s = store.get();
    if (s.targetUrl !== lastState.targetUrl) scene.setTargetUrl(s.targetUrl);
    if (s.liveMode !== lastState.liveMode) scene.setIframeVisible(wantIframe(s));
    if (s.liveFace !== lastState.liveFace) { scene.setLiveFace(s.liveFace); scene.setView("front"); }
    repaintAll();
    liveCanvas.reconcile();
    persist();
  });

  const persist = debounce(() => {
    const s = store.get();
    saveToStorage(s);
    writeToLocationHash(s);
  }, 240);

  // ---------- pointer routing on the WebGL canvas ----------
  // Click (no-drag) on the cube anywhere → select that face for decoration.
  // Iframe interactions never get here — the iframe captures its own events.
  let downX = 0;
  let downY = 0;
  let downHit: { faceId: number; u: number; v: number } | null = null;
  on(scene.renderer.domElement, "pointerdown", (ev) => {
    const e = ev as PointerEvent;
    downX = e.clientX; downY = e.clientY;
    downHit = scene.pickFace(e.clientX, e.clientY);
  });
  on(scene.renderer.domElement, "pointerup", (ev) => {
    const e = ev as PointerEvent;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved > 6) { downHit = null; return; }
    const hit = downHit ?? scene.pickFace(e.clientX, e.clientY);
    downHit = null;
    if (!hit) return;
    store.update((st) => ({ ...st, selectedFace: hit.faceId as FaceId }));
  });

  // Cursor: grab over cube empty space, default elsewhere.
  on(scene.renderer.domElement, "pointermove", (ev) => {
    const e = ev as PointerEvent;
    const hit = scene.pickFace(e.clientX, e.clientY);
    scene.renderer.domElement.style.cursor = hit ? "grab" : "";
  });

  // Right-click → drop a ✨ sticker at hit point.
  on(scene.renderer.domElement, "contextmenu", (ev) => {
    const e = ev as MouseEvent;
    e.preventDefault();
    const hit = scene.pickFace(e.clientX, e.clientY);
    if (!hit) return;
    store.update((st) => {
      const fid = hit.faceId as FaceId;
      const fs = st.faces.slice();
      const f = { ...fs[fid] };
      f.stickers = f.stickers.concat({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        glyph: "✨",
        u: hit.u, v: hit.v,
        scale: 1, rotation: 0
      });
      fs[fid] = f;
      return { ...st, faces: fs, selectedFace: fid };
    });
  });

  // Persist once at boot in case the hash differed from storage.
  saveToStorage(store.get());

  on(document, "visibilitychange", () => {
    scene.setIdleSpin(!document.hidden);
  });
}

function themeChanged(a: AppState, b: AppState): boolean {
  return (
    a.preset !== b.preset ||
    a.hue !== b.hue ||
    a.glow !== b.glow ||
    a.radius !== b.radius ||
    a.accent !== b.accent ||
    a.fontFamily !== b.fontFamily ||
    a.liveFace !== b.liveFace ||
    a.liveMode !== b.liveMode
  );
}

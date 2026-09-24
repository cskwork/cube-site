/**
 * Viewfinder chrome around the 3D cube: the address strip (which site is on
 * the live face, and how it is shown), the view keys (front / overview /
 * turn), a loading state for the live site, and a one-time coach card.
 */

import { el, on } from "../util/dom";
import type { AppState, LiveMode, Store } from "../app/state";
import type { SceneHandles } from "../dice/scene";
import { detectMode } from "../htmlCanvas/adapter";
import { icon } from "./icons";

export interface StageChrome {
  bar: HTMLElement;
  keys: HTMLElement;
  /** Call once the scene exists; wires the view keys, keyboard and loading state. */
  attach(scene: SceneHandles, viewfinder: HTMLElement): void;
}

/** Accepts "example.com" or a full URL; returns a normalized http(s) URL or null. */
export function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const MODES: { id: LiveMode; label: string }[] = [
  { id: "iframe", label: "실제 사이트" },
  { id: "card", label: "스타일 카드" },
  { id: "html-canvas", label: "HTML-in-Canvas" }
];

const COACH_KEY = "cube-site.coach.v1";

export function createStageChrome(store: Store, opts: { coachArt?: string } = {}): StageChrome {
  const native = detectMode() === "native";

  // ---------- address strip ----------
  const urlInput = el("input", {
    type: "url",
    id: "site-url",
    class: "address__input",
    inputmode: "url",
    autocomplete: "url",
    spellcheck: "false",
    placeholder: "https://example.com",
    value: store.get().targetUrl,
    "aria-describedby": "site-url-msg"
  }) as HTMLInputElement;
  const applyBtn = el("button", { type: "submit", class: "key key--ink" }, ["띄우기"]);
  const msg = el("p", { id: "site-url-msg", class: "address__msg", "aria-live": "polite" });
  const form = el("form", { class: "address", role: "search", "aria-label": "라이브 사이트" }, [
    el("label", { class: "address__label", for: "site-url" }, [icon("live", 18), el("span", { class: "sr-only" }, ["라이브 사이트 URL"])]),
    urlInput,
    applyBtn
  ]);

  on(form, "submit", (ev) => {
    ev.preventDefault();
    const url = normalizeUrl(urlInput.value);
    if (!url) {
      urlInput.setAttribute("aria-invalid", "true");
      msg.textContent = "주소를 확인해 주세요. 예: example.com";
      msg.classList.add("is-error");
      return;
    }
    urlInput.removeAttribute("aria-invalid");
    msg.classList.remove("is-error");
    msg.textContent = "";
    urlInput.value = url;
    store.update((st) => ({ ...st, targetUrl: url }));
  });
  on(urlInput, "input", () => {
    if (urlInput.getAttribute("aria-invalid")) {
      urlInput.removeAttribute("aria-invalid");
      msg.classList.remove("is-error");
      msg.textContent = "";
    }
  });

  const pills: HTMLButtonElement[] = MODES.map(({ id, label }) => {
    const gated = id === "html-canvas" && !native;
    const b = el("button", {
      type: "button",
      class: "seg__item",
      "data-mode": id,
      "aria-pressed": store.get().liveMode === id ? "true" : "false",
      disabled: gated,
      title: gated
        ? "Chrome 플래그(chrome://flags/#canvas-draw-element)나 Origin Trial이 켜진 브라우저에서만 쓸 수 있는 실험 기능이에요."
        : undefined
    }, [label]) as HTMLButtonElement;
    if (!gated) on(b, "click", () => store.update((st) => ({ ...st, liveMode: id })));
    return b;
  });
  const seg = el("div", { class: "seg", role: "group", "aria-label": "사이트 면 보기 방식" }, pills);

  const bar = el("div", { class: "viewfinder-bar" }, [form, seg, msg]);

  // ---------- view keys ----------
  const frontBtn = viewKey("front", "사이트 정면");
  const overBtn = viewKey("cube", "둘러보기");
  const leftBtn = viewKey("turnLeft", "왼쪽으로 돌리기", true);
  const rightBtn = viewKey("turnRight", "오른쪽으로 돌리기", true);
  const status = el("p", { class: "status-chip" + (native ? " is-on" : "") }, [
    el("span", { class: "status-chip__dot", "aria-hidden": "true" }),
    el("span", {}, [native ? "HTML-in-Canvas 사용 가능" : "HTML-in-Canvas 꺼짐"]),
    el("a", {
      href: "https://developer.chrome.com/blog/html-in-canvas-origin-trial",
      target: "_blank",
      rel: "noopener noreferrer"
    }, ["자세히"])
  ]);
  const keys = el("div", { class: "view-keys", role: "toolbar", "aria-label": "큐브 시점" }, [
    frontBtn, overBtn, leftBtn, rightBtn, status
  ]);

  let lastState: AppState = store.get();
  store.subscribe((s) => {
    if (s.targetUrl !== lastState.targetUrl && document.activeElement !== urlInput) {
      urlInput.value = s.targetUrl;
    }
    if (s.liveMode !== lastState.liveMode) {
      pills.forEach((p) => p.setAttribute("aria-pressed", p.dataset.mode === s.liveMode ? "true" : "false"));
    }
    lastState = s;
  });

  function attach(scene: SceneHandles, viewfinder: HTMLElement): void {
    on(frontBtn, "click", () => scene.setView("front"));
    on(overBtn, "click", () => scene.setView("overview"));
    on(leftBtn, "click", () => scene.orbitBy(-Math.PI / 2));
    on(rightBtn, "click", () => scene.orbitBy(Math.PI / 2));

    // Keyboard orbit on the focused cube canvas.
    const canvas = scene.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "3D 사이트 큐브. 화살표 키로 돌리고, Home 키로 사이트 정면을 봐요.");
    on(canvas, "keydown", (ev) => {
      const e = ev as KeyboardEvent;
      const step = Math.PI / 6;
      const moves: Record<string, () => void> = {
        ArrowLeft: () => scene.orbitBy(-step),
        ArrowRight: () => scene.orbitBy(step),
        ArrowUp: () => scene.orbitBy(0, -step),
        ArrowDown: () => scene.orbitBy(0, step),
        Home: () => scene.setView("front"),
        End: () => scene.setView("overview")
      };
      const fn = moves[e.key];
      if (!fn) return;
      e.preventDefault();
      fn();
    });

    // Live-site loading state: from URL change until the frame reports load.
    let loadTimer: number | undefined;
    const loading = el("div", { class: "vf-loading", role: "status" }, [
      el("span", { class: "vf-loading__bar", "aria-hidden": "true" }),
      el("span", { class: "vf-loading__text" }, ["사이트 불러오는 중"])
    ]);
    viewfinder.appendChild(loading);
    const setLoading = (on: boolean) => {
      viewfinder.toggleAttribute("data-loading", on);
      if (loadTimer) clearTimeout(loadTimer);
      if (on) {
        loadTimer = window.setTimeout(() => {
          viewfinder.removeAttribute("data-loading");
          msg.textContent = "사이트가 비어 보이면 그 사이트가 다른 곳에 띄우는 걸 막아 둔 거예요. 스타일 카드로 바꿔 보세요.";
        }, 9000);
      }
    };
    on(scene.iframe, "load", () => setLoading(false));
    let prevUrl = store.get().targetUrl;
    store.subscribe((s) => {
      if (s.targetUrl === prevUrl) return;
      prevUrl = s.targetUrl;
      msg.classList.remove("is-error");
      msg.textContent = "";
      if (s.liveMode === "iframe") setLoading(true);
      scene.setView("front");
    });

    // One-time coach card.
    let seen = false;
    try { seen = localStorage.getItem(COACH_KEY) === "1"; } catch { /* private mode */ }
    if (!seen) {
      const close = el("button", { type: "button", class: "coach__close", "aria-label": "안내 닫기" }, [icon("close", 16)]);
      const coach = el("aside", { class: "coach", "aria-label": "사용 안내" }, [
        opts.coachArt
          ? el("img", { src: opts.coachArt, alt: "", width: "72", height: "72", decoding: "async" })
          : null,
        el("p", {}, [
          el("strong", {}, ["큐브 바깥을 드래그해서 돌려요."]),
          " 사이트 면은 진짜 사이트라 바로 눌러 볼 수 있어요."
        ]),
        close
      ]);
      const dismiss = () => {
        coach.remove();
        scene.controls.removeEventListener("start", dismiss);
        try { localStorage.setItem(COACH_KEY, "1"); } catch { /* ignore */ }
      };
      on(close, "click", dismiss);
      scene.controls.addEventListener("start", dismiss);
      viewfinder.appendChild(coach);
    }
  }

  return { bar, keys, attach };
}

function viewKey(name: Parameters<typeof icon>[0], label: string, iconOnly = false): HTMLButtonElement {
  return el("button", {
    type: "button",
    class: "key key--view" + (iconOnly ? " key--icon" : ""),
    "aria-label": iconOnly ? label : undefined,
    title: label
  }, [icon(name, 18), iconOnly ? null : el("span", { class: "key__label" }, [label])]) as HTMLButtonElement;
}

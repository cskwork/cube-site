import { el } from "../util/dom";
import type { AdapterMode } from "../htmlCanvas/adapter";

export interface BannerHandles {
  root: HTMLElement;
  setMode(mode: AdapterMode): void;
}

export function createBanner(initialMode: AdapterMode): BannerHandles {
  const dot = el("span", { class: "banner__dot", "aria-hidden": "true" });
  const text = el("span", {}, [initialMode === "native"
    ? "HTML-in-Canvas 실시간 모드 ON"
    : "현재 미리보기 모드 · 라이브 HTML은 Chrome 플래그가 필요해요"]);
  const link = el("a", {
    href: "https://developer.chrome.com/blog/html-in-canvas-origin-trial",
    target: "_blank",
    rel: "noopener noreferrer",
    style: "color:inherit;text-decoration:underline;text-underline-offset:3px;",
  }, ["자세히"]);
  const root = el("div", {
    class: "banner" + (initialMode === "native" ? " is-ok" : ""),
    role: "status",
    "aria-live": "polite"
  }, [dot, text, link]);

  function setMode(mode: AdapterMode): void {
    root.classList.toggle("is-ok", mode === "native");
    text.textContent = mode === "native"
      ? "HTML-in-Canvas 실시간 모드 ON"
      : "현재 미리보기 모드 · 라이브 HTML은 Chrome 플래그가 필요해요";
  }

  return { root, setMode };
}

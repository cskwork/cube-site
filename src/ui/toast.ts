import { el } from "../util/dom";

let toastTimer: number | undefined;

export function toast(message: string, kind: "ok" | "warn" = "ok"): void {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const dotColor = kind === "ok" ? "var(--c-success)" : "var(--c-warn)";
  const node = el("div", { class: "toast", role: "status", "aria-live": "polite" }, [
    el("span", { style: `display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};box-shadow:0 0 8px ${dotColor};` }),
    message
  ]);
  document.body.appendChild(node);
  toastTimer = window.setTimeout(() => node.remove(), 2400);
}

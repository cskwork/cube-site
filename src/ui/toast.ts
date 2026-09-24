import { el, on } from "../util/dom";

let toastTimer: number | undefined;

export interface ToastAction {
  label: string;
  run: () => void;
}

/** A caption at the bottom of the viewfinder. Optional action (e.g. 되돌리기). */
export function toast(message: string, kind: "ok" | "warn" = "ok", action?: ToastAction): void {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const node = el("div", {
    class: `toast toast--${kind}`,
    role: "status",
    "aria-live": "polite"
  }, [el("span", { class: "toast__text" }, [message])]);

  if (action) {
    const btn = el("button", { type: "button", class: "toast__action" }, [action.label]);
    on(btn, "click", () => {
      action.run();
      node.remove();
    });
    node.appendChild(btn);
  }

  document.body.appendChild(node);
  toastTimer = window.setTimeout(() => node.remove(), action ? 6000 : 2600);
}

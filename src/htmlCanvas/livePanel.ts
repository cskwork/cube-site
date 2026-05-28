/**
 * The live HTML panel painted onto the cube's live face via the
 * HTML-in-Canvas drawElementImage path. This is real, accessible DOM —
 * the whole point of the showcase: HTML → drawElementImage → 2D canvas →
 * WebGL CanvasTexture → the rotating 3D face.
 *
 * Built with the DOM API + inline styles (the subtree lives off-screen
 * under a <canvas layoutsubtree>, so external CSS is not relied upon).
 * Dynamic text is set via textContent to avoid HTML injection from the
 * user-supplied target URL.
 */

import type { AppState } from "../app/state";
import { PRESETS } from "../app/state";

const FONT = '"Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif';

function div(style: string, text?: string): HTMLDivElement {
  const d = document.createElement("div");
  d.setAttribute("style", style);
  if (text !== undefined) d.textContent = text;
  return d;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

export function formatClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** (Re)render the live panel's content for the current app state. */
export function renderLivePanel(panel: HTMLElement, s: AppState): void {
  const accent = s.accent;
  const host = hostOf(s.targetUrl);
  const presetLabel = PRESETS[s.preset]?.label ?? s.preset;

  panel.replaceChildren();
  panel.setAttribute(
    "style",
    [
      "box-sizing:border-box",
      "width:100%",
      "height:100%",
      "padding:8%",
      "display:flex",
      "flex-direction:column",
      "gap:5%",
      "border-radius:5%",
      "overflow:hidden",
      `font-family:${FONT}`,
      "color:#f7f8ff",
      `background:radial-gradient(120% 120% at 12% 8%, ${accent}3a 0%, transparent 42%), linear-gradient(150deg, #11162a 0%, #070a14 100%)`,
      `border:2px solid ${accent}55`
    ].join(";")
  );

  // ---- badge row ----
  const badge = div(
    [
      "display:inline-flex",
      "align-items:center",
      "gap:0.6em",
      "align-self:flex-start",
      "padding:0.5em 1em",
      "border-radius:999px",
      `background:${accent}22`,
      `border:1px solid ${accent}66`,
      "font-size:2.2vmin",
      "font-weight:700",
      "letter-spacing:0.04em"
    ].join(";")
  );
  badge.appendChild(
    div(
      [
        "width:0.8em",
        "height:0.8em",
        "border-radius:50%",
        `background:${accent}`,
        `box-shadow:0 0 12px ${accent}`
      ].join(";")
    )
  );
  badge.appendChild(div("", "LIVE · HTML in Canvas"));
  panel.appendChild(badge);

  // ---- title ----
  panel.appendChild(
    div(
      "font-size:8vmin;font-weight:800;line-height:1.05;margin-top:0.2em",
      host
    )
  );

  // ---- explanation ----
  panel.appendChild(
    div(
      "font-size:3vmin;line-height:1.5;color:#c8cdf2;max-width:90%",
      "이 면은 실제 DOM을 drawElementImage 로 캔버스에 그린 뒤 WebGL 텍스처로 큐브에 입힌 거예요."
    )
  );

  // ---- chips ----
  const chips = div("display:flex;flex-wrap:wrap;gap:1.6vmin;margin-top:auto");
  [presetLabel, "drawElementImage", "WebGL texture"].forEach((t) => {
    chips.appendChild(
      div(
        [
          "padding:0.5em 0.9em",
          "border-radius:999px",
          "background:rgba(255,255,255,0.07)",
          "border:1px solid rgba(255,255,255,0.14)",
          "font-size:2.2vmin",
          "font-weight:600"
        ].join(";"),
        t
      )
    );
  });
  panel.appendChild(chips);

  // ---- live clock (proves paints are demand-driven on content change) ----
  const clockRow = div("display:flex;align-items:baseline;gap:0.6em;font-size:3vmin;color:#9aa3c7");
  clockRow.appendChild(div("", "now"));
  const clock = div("font-size:5vmin;font-weight:800;color:#f7f8ff;font-variant-numeric:tabular-nums");
  clock.setAttribute("data-clock", "");
  clock.textContent = formatClock(new Date());
  clockRow.appendChild(clock);
  panel.appendChild(clockRow);
}

/** Update only the live clock element (cheap re-paint trigger). */
export function tickLivePanel(panel: HTMLElement): void {
  const clock = panel.querySelector<HTMLElement>("[data-clock]");
  if (clock) clock.textContent = formatClock(new Date());
}

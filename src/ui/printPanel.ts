/**
 * 네컷 출력 section of the 공유 step: prints the cube as a four-frame strip,
 * then offers save and (where the browser supports file sharing) share.
 */

import { el, on } from "../util/dom";
import type { Store } from "../app/state";
import { canvasToBlob, composeStrip, stripFileName, type CaptureFn } from "../share/printStrip";
import { icon } from "./icons";
import { toast } from "./toast";

export interface PrintDeps {
  capture: CaptureFn;
  /** Public path of the empty-tray illustration. */
  emptyArt?: string;
}

/** The last print survives tab switches for the session. */
let lastPrint: { url: string; blob: Blob; name: string } | null = null;

export function createPrintSection(store: Store, deps: PrintDeps): HTMLElement {
  const tray = el("div", { class: "print-tray", "aria-live": "polite" });
  const printBtn = el("button", { type: "button", class: "key key--lemon key--wide" }, [
    icon("print", 18), el("span", {}, ["네컷 출력"])
  ]) as HTMLButtonElement;
  const actions = el("div", { class: "row print-actions" });

  function showEmpty(): void {
    const kids: Node[] = [];
    if (deps.emptyArt) {
      kids.push(el("img", {
        class: "print-tray__art",
        src: deps.emptyArt,
        alt: "파란 출력구에서 빈 네컷 사진 띠가 반쯤 나온 그림",
        width: "160", height: "160", loading: "lazy", decoding: "async"
      }));
    }
    kids.push(el("p", { class: "hint" }, ["큐브를 네 각도에서 찍어 사진 띠 한 장으로 뽑아요. 사이트 면은 꾸민 모습으로 찍혀요."]));
    tray.replaceChildren(...kids);
    actions.replaceChildren();
  }

  function showPrint(p: NonNullable<typeof lastPrint>, fresh: boolean): void {
    const img = el("img", {
      class: "print-strip" + (fresh ? " is-fresh" : ""),
      src: p.url,
      alt: "꾸민 큐브를 네 각도에서 찍은 네컷 사진 띠",
      width: "600", height: "1800"
    });
    tray.replaceChildren(img);

    const save = el("a", { class: "key", href: p.url, download: p.name }, [icon("download", 18), el("span", {}, ["저장"])]);
    const kids: HTMLElement[] = [save];
    const file = new File([p.blob], p.name, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      const share = el("button", { type: "button", class: "key" }, [icon("share", 18), el("span", {}, ["보내기"])]);
      on(share, "click", async () => {
        try {
          await nav.share({ files: [file], title: "Cube Site 네컷" });
        } catch (e) {
          if ((e as DOMException)?.name !== "AbortError") toast("보내지 못했어요. 저장한 뒤 직접 보내 주세요.", "warn");
        }
      });
      kids.push(share);
    }
    actions.replaceChildren(...kids);
  }

  on(printBtn, "click", async () => {
    if (printBtn.getAttribute("aria-busy") === "true") return;
    printBtn.setAttribute("aria-busy", "true");
    printBtn.disabled = true;
    tray.classList.add("is-busy");
    try {
      const now = new Date();
      const canvas = await composeStrip(store.get(), deps.capture, now);
      const blob = await canvasToBlob(canvas);
      if (lastPrint) URL.revokeObjectURL(lastPrint.url);
      lastPrint = { url: URL.createObjectURL(blob), blob, name: stripFileName(now) };
      showPrint(lastPrint, true);
    } catch {
      toast("출력하지 못했어요. 이 브라우저에서 WebGL 캡처가 막혀 있을 수 있어요.", "warn");
    } finally {
      printBtn.removeAttribute("aria-busy");
      printBtn.disabled = false;
      tray.classList.remove("is-busy");
    }
  });

  if (lastPrint) showPrint(lastPrint, false);
  else showEmpty();

  return el("section", { class: "group" }, [
    el("h2", { class: "group__title" }, ["네컷 출력"]),
    el("div", { class: "group__body" }, [tray, printBtn, actions])
  ]);
}

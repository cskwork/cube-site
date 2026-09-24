import { el, on, copyText } from "../util/dom";
import {
  applyPreset, defaultState, PRESETS, FACE_LABELS_KO,
  type AppState, type FaceId, type PresetId, type Store
} from "../app/state";
import type { History } from "../app/history";
import { buildShareUrl } from "../share/hash";
import { toast } from "./toast";
import { icon } from "./icons";
import { createPrintSection, type PrintDeps } from "./printPanel";

/** A store write that should NOT trigger a panel rebuild (continuous edits). */
type LiveUpdate = (mut: (s: AppState) => AppState) => void;

const STICKERS = [
  "🌸", "🍑", "🍓", "⭐", "✨", "💖", "🪐", "🌈",
  "☁️", "🧋", "🐰", "🎀", "🍒", "🦄", "🍡", "💎",
  "🌟", "🍩", "🪩", "🧁", "🐻", "🎵", "🐾", "🌷"
];

const FONT_PRESETS: { label: string; value: string }[] = [
  { label: "Pretendard", value: '"Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif' },
  { label: "Apple Gothic", value: '"Apple SD Gothic Neo", system-ui, sans-serif' },
  { label: "Mono", value: 'ui-monospace, "SF Mono", Menlo, monospace' },
  { label: "Serif", value: 'ui-serif, "Apple SD Gothic Neo", Georgia, serif' }
];

export interface ToolsHandles {
  root: HTMLElement;
  refresh(): void;
}

export interface ToolsOptions {
  /** Undo/redo stack; when absent the history keys are omitted. */
  history?: History;
  /** 네컷 출력 renderer; when absent the print section is omitted. */
  print?: PrintDeps;
}

type TabId = "deco" | "imprint" | "share";

export function createTools(store: Store, opts: ToolsOptions = {}): ToolsHandles {
  const { history } = opts;
  let activeTab: TabId = "deco";
  const tabBtns: Record<TabId, HTMLButtonElement> = {} as Record<TabId, HTMLButtonElement>;
  const body = el("div", { class: "tools-body" });

  // See store.subscribe below: live() marks a store write as an in-place edit
  // so the panel is not rebuilt mid-interaction (slider drag, color scrub).
  let suppressRebuild = false;
  const live: LiveUpdate = (mut) => {
    suppressRebuild = true;
    try { store.update(mut); } finally { suppressRebuild = false; }
  };

  const TAB_ORDER: TabId[] = ["deco", "imprint", "share"];
  function selectTab(id: TabId, focus = false): void {
    activeTab = id;
    for (const [k, v] of Object.entries(tabBtns)) {
      const on = k === id;
      v.setAttribute("aria-selected", on ? "true" : "false");
      v.tabIndex = on ? 0 : -1;
    }
    body.setAttribute("aria-labelledby", `tab-${id}`);
    renderBody();
    if (focus) tabBtns[id].focus();
  }

  function makeTab(id: TabId, step: string, label: string): HTMLButtonElement {
    const b = el("button", {
      type: "button",
      role: "tab",
      id: `tab-${id}`,
      class: "step",
      "aria-controls": "tools-body",
      "aria-selected": id === activeTab ? "true" : "false",
      tabindex: id === activeTab ? "0" : "-1"
    }, [el("span", { class: "step__num", "aria-hidden": "true" }, [step]), el("span", { class: "step__label" }, [label])]);
    on(b, "click", () => selectTab(id));
    on(b, "keydown", (ev) => {
      const e = ev as KeyboardEvent;
      const i = TAB_ORDER.indexOf(id);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = TAB_ORDER[(i + (e.key === "ArrowRight" ? 1 : TAB_ORDER.length - 1)) % TAB_ORDER.length];
        selectTab(next, true);
      }
    });
    tabBtns[id] = b;
    return b;
  }

  const tabs = el("div", { class: "tools-tabs", role: "tablist", "aria-label": "꾸미기 단계" }, [
    makeTab("deco", "1", "꾸미기"),
    makeTab("imprint", "2", "글자 새기기"),
    makeTab("share", "3", "공유")
  ]);
  body.id = "tools-body";
  body.setAttribute("role", "tabpanel");
  body.setAttribute("aria-labelledby", "tab-deco");
  body.tabIndex = -1;

  function renderBody(): void {
    body.replaceChildren();
    if (activeTab === "deco") renderDeco(body, store, live);
    else if (activeTab === "imprint") renderImprint(body, store, live);
    else renderShare(body, store, opts.print);
  }

  // Footer row — 되돌리기 · 다시 · 초기화 (좌측) · 공유 링크 복사 (우측).
  const resetBtn = el("button", {
    type: "button",
    class: "key key--ghost",
    "aria-label": "꾸미기 초기화",
    title: "초기화"
  }, [icon("reset", 18), el("span", { class: "key__label" }, ["초기화"])]);
  on(resetBtn, "click", () => {
    // With history the reset is undoable, so no blocking confirm() is needed.
    if (!history) {
      if (!confirm("지금 꾸민 큐브를 모두 지우고 처음으로 돌아갈까요?")) return;
      store.set(defaultState());
      toast("초기화 완료");
      return;
    }
    history.checkpoint();
    store.set(defaultState());
    toast("처음 상태로 돌렸어요.", "ok", { label: "되돌리기", run: () => { history.undo(); } });
  });

  const historyKeys: HTMLElement[] = [];
  if (history) {
    const undoBtn = el("button", { type: "button", class: "key key--icon", "aria-label": "되돌리기 (Ctrl+Z)", title: "되돌리기" }, [icon("undo", 18)]) as HTMLButtonElement;
    const redoBtn = el("button", { type: "button", class: "key key--icon", "aria-label": "다시 하기 (Ctrl+Shift+Z)", title: "다시 하기" }, [icon("redo", 18)]) as HTMLButtonElement;
    const depth = el("span", { class: "history-depth", "aria-hidden": "true" });
    on(undoBtn, "click", () => history.undo());
    on(redoBtn, "click", () => history.redo());
    const sync = () => {
      undoBtn.disabled = !history.canUndo;
      redoBtn.disabled = !history.canRedo;
      depth.textContent = history.undoDepth > 0 ? String(history.undoDepth) : "";
    };
    history.subscribe(sync);
    sync();
    historyKeys.push(el("div", { class: "history-keys", role: "group", "aria-label": "편집 기록" }, [undoBtn, depth, redoBtn]));
  }

  const shareBtn = el("button", {
    type: "button",
    class: "key key--lemon",
    "aria-label": "공유 링크 복사"
  }, [icon("link", 18), el("span", {}, ["공유 링크 복사"])]);
  on(shareBtn, "click", async () => {
    try {
      await copyText(buildShareUrl(store.get()));
      toast("링크가 복사됐어요. 친구한테 보내봐요.");
    } catch {
      toast("복사 실패. 주소창에서 직접 복사해 주세요.", "warn");
    }
  });

  const footer = el("div", { class: "tools-footer" }, [
    el("div", { class: "row" }, [...historyKeys, resetBtn]),
    shareBtn
  ]);

  const brand = el("header", { class: "tools-brand" }, [
    el("h1", { class: "brand" }, ["Cube Site"]),
    el("p", { class: "brand__sub" }, ["3D 사이트 큐브 · 사이트를 띄우고, 꾸미고, 공유해요"])
  ]);

  const root = el("aside", { class: "tools-panel app-tools", "aria-label": "꾸미기 패널" }, [
    brand, tabs, body, footer
  ]);

  renderBody();
  // The deco/imprint panels must refresh when state changes from OUTSIDE the
  // panel (cube face click → selectedFace, reset, preset) so they reflect the
  // active face. But a full rebuild while the user is dragging a slider or
  // scrubbing a color picker would replace the very <input> being edited —
  // breaking pointer-capture and stealing focus. So continuous in-panel edits
  // route through live() below, which suppresses the rebuild for that update.
  // The share tab self-manages its controls and is never auto-rebuilt.
  store.subscribe(() => {
    if (suppressRebuild || activeTab === "share") return;
    renderBody();
  });

  return { root, refresh: renderBody };
}

// ---------- 꾸미기 ----------

function renderDeco(body: HTMLElement, store: Store, live: LiveUpdate): void {
  const s = store.get();

  body.appendChild(section("테마 프리셋", [
    el("div", { class: "preset-grid" },
      (Object.keys(PRESETS) as PresetId[]).map((id) => {
        const meta = PRESETS[id];
        const btn = el("button", {
          class: "preset",
          type: "button",
          "data-preset": id,
          "aria-pressed": s.preset === id ? "true" : "false"
        }, [el("span", { class: "preset__name" }, [meta.label])]);
        on(btn, "click", () => store.update((st) => applyPreset(st, id)));
        return btn;
      })
    )
  ]));

  body.appendChild(section("어느 면 꾸밀까?", [
    el("div", { class: "face-select", role: "group", "aria-label": "큐브 면 선택" },
      Array.from({ length: 6 }, (_, i) => {
        const fid = i as FaceId;
        const isSel = s.selectedFace === fid;
        const isLive = s.liveFace === fid;
        const btn = el("button", {
          type: "button",
          class: "face-pill" + (isLive ? " face-pill--live" : ""),
          "aria-pressed": isSel ? "true" : "false",
          "aria-label": `${FACE_LABELS_KO[fid]}면 선택${isLive ? " (사이트가 보이는 면)" : ""}`,
          title: isLive ? "사이트가 보이는 면" : undefined
        }, [isLive ? icon("live", 16) : null, el("span", {}, [FACE_LABELS_KO[fid]])]);
        on(btn, "click", () => store.update((st) => ({ ...st, selectedFace: fid })));
        return btn;
      })
    )
  ]));

  body.appendChild(section("색상과 효과", [
    sliderField("색조 (Hue)", s.hue, 0, 360, 1, "deg", (v) =>
      live((st) => ({ ...st, hue: v }))),
    sliderField("발광 (Glow)", Math.round(s.glow * 100), 0, 100, 1, "%", (v) =>
      live((st) => ({ ...st, glow: v / 100 }))),
    sliderField("모서리 둥글기", s.radius, 8, 40, 1, "px", (v) =>
      live((st) => ({ ...st, radius: v }))),
    rowField("강조 색", el("input", {
      type: "color",
      class: "swatch",
      value: s.accent,
      "aria-label": "강조 색 선택"
    }), (input) => {
      on(input as HTMLInputElement, "input", (e) => {
        const v = (e.target as HTMLInputElement).value;
        live((st) => ({ ...st, accent: v }));
      });
    }),
    rowField(`${FACE_LABELS_KO[s.selectedFace]}면 색`, el("input", {
      type: "color",
      class: "swatch",
      value: s.faces[s.selectedFace].baseColor,
      "aria-label": "현재 선택한 면의 색"
    }), (input) => {
      on(input as HTMLInputElement, "input", (e) => {
        const v = (e.target as HTMLInputElement).value;
        live((st) => {
          const fs = st.faces.slice();
          fs[st.selectedFace] = { ...fs[st.selectedFace], baseColor: v };
          return { ...st, faces: fs };
        });
      });
    })
  ]));

  body.appendChild(section(`스티커 (${FACE_LABELS_KO[s.selectedFace]}면에 추가)`, [
    el("div", { class: "sticker-tray", role: "group", "aria-label": "스티커 선택" },
      STICKERS.map((g) => {
        const chip = el("button", {
          class: "sticker-chip", type: "button",
          "aria-label": `${g} 스티커 추가`
        }, [g]);
        on(chip, "click", () => {
          store.update((st) => {
            const fs = st.faces.slice();
            const f = { ...fs[st.selectedFace] };
            f.stickers = f.stickers.concat({
              id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              glyph: g,
              u: 0.5 + (Math.random() - 0.5) * 0.4,
              v: 0.5 + (Math.random() - 0.5) * 0.4,
              scale: 0.9 + Math.random() * 0.5,
              rotation: (Math.random() - 0.5) * 24
            });
            fs[st.selectedFace] = f;
            return { ...st, faces: fs };
          });
        });
        return chip;
      })
    ),
    el("div", { class: "row row--space" }, [
      el("span", { class: "hint hint--count" }, [
        `이 면 스티커: ${s.faces[s.selectedFace].stickers.length}개`
      ]),
      (() => {
        const b = el("button", { type: "button", class: "key key--ghost key--small" }, [icon("trash", 16), el("span", {}, ["면 스티커 지우기"])]);
        b.toggleAttribute("disabled", s.faces[s.selectedFace].stickers.length === 0);
        on(b, "click", () => {
          store.update((st) => {
            const fs = st.faces.slice();
            fs[st.selectedFace] = { ...fs[st.selectedFace], stickers: [] };
            return { ...st, faces: fs };
          });
        });
        return b;
      })()
    ])
  ]));

  body.appendChild(
    el("p", { class: "hint" }, [
      "큐브에서 면을 누르면 그 면이 꾸미기 대상이 돼요. 오른쪽 클릭하면 그 자리에 ✨ 스티커가 붙어요."
    ])
  );
}

// ---------- 글자 새기기 ----------

function renderImprint(body: HTMLElement, store: Store, live: LiveUpdate): void {
  const s = store.get();
  const cur = s.faces[s.selectedFace].imprint ?? {
    text: "",
    color: "#ffffff",
    glow: 0.4,
    size: 64,
    fontFamily: s.fontFamily
  };

  const textInput = el("input", {
    type: "text", class: "input", maxlength: "20",
    placeholder: "예: 내 큐브 ✨", value: cur.text,
    "aria-label": "새길 글자"
  });
  const colorInput = el("input", { type: "color", class: "swatch", value: cur.color, "aria-label": "글자 색" });
  const sizeSlider = el("input", { type: "range", class: "slider", min: "16", max: "120", step: "1", value: String(cur.size), "aria-label": "글자 크기" });
  const glowSlider = el("input", { type: "range", class: "slider", min: "0", max: "100", step: "1", value: String(Math.round(cur.glow * 100)), "aria-label": "글자 발광" });
  const fontSelect = el("select", { class: "select", "aria-label": "글자체" },
    FONT_PRESETS.map((f) =>
      el("option", { value: f.value, selected: cur.fontFamily === f.value }, [f.label])
    )
  );
  [textInput, colorInput, sizeSlider, glowSlider].forEach((n) => on(n, "input", writeImprint));
  on(fontSelect, "change", writeImprint);

  function writeImprint(): void {
    const t = (textInput as HTMLInputElement).value;
    if (!t.trim()) {
      live((st) => {
        const fs = st.faces.slice();
        const f = { ...fs[st.selectedFace] };
        delete f.imprint;
        fs[st.selectedFace] = f;
        return { ...st, faces: fs };
      });
      return;
    }
    live((st) => {
      const fs = st.faces.slice();
      const f = { ...fs[st.selectedFace] };
      f.imprint = {
        text: t,
        color: (colorInput as HTMLInputElement).value,
        size: Number((sizeSlider as HTMLInputElement).value),
        glow: Number((glowSlider as HTMLInputElement).value) / 100,
        fontFamily: (fontSelect as HTMLSelectElement).value
      };
      fs[st.selectedFace] = f;
      return { ...st, faces: fs };
    });
  }

  body.appendChild(section(`${FACE_LABELS_KO[s.selectedFace]}면에 글자 새기기`, [
    rowField("문구", textInput, () => {}),
    rowField("글자체", fontSelect, () => {}),
    rowField("색", colorInput, () => {}),
    rowField("크기", sizeSlider, () => {}),
    rowField("발광", glowSlider, () => {})
  ]));

  body.appendChild(
    el("p", { class: "hint" }, [
      "글자는 면 가운데에 새겨져요. 20자까지 가능해요."
    ])
  );
}

// ---------- 공유 ----------

function renderShare(body: HTMLElement, store: Store, print?: PrintDeps): void {
  if (print) body.appendChild(createPrintSection(store, print));

  const linkOut = el("output", { class: "share-link", "aria-label": "공유 링크" }, [buildShareUrl(store.get())]);
  const copyBtn = el("button", { type: "button", class: "key" }, [icon("link", 18), el("span", {}, ["링크 복사"])]);
  on(copyBtn, "click", async () => {
    try {
      await copyText(buildShareUrl(store.get()));
      toast("링크가 복사됐어요. 친구한테 보내봐요.");
    } catch {
      toast("복사하지 못했어요. 주소창에서 직접 복사해 주세요.", "warn");
    }
  });

  body.appendChild(section("공유 링크", [
    el("p", { class: "hint" }, ["꾸민 큐브와 사이트 주소가 링크 하나에 다 담겨요. 받은 사람도 똑같은 큐브를 봐요."]),
    linkOut,
    copyBtn
  ]));

  body.appendChild(section("도움말", [
    el("ul", { class: "help-list" }, [
      el("li", {}, ["큐브의 ", el("strong", {}, ["사이트가 보이는 면"]), "은 진짜 iframe이라 클릭, 스크롤, 입력이 모두 돼요."]),
      el("li", {}, ["큐브 바깥 빈 곳을 드래그하거나, 큐브를 누른 뒤 화살표 키로 돌려요."]),
      el("li", {}, ["다른 면을 누르면 그 면이 꾸미기 대상이 돼요."]),
      el("li", {}, [
        el("span", { class: "kbd" }, ["Ctrl/⌘ Z"]), " 로 되돌리고, ",
        el("span", { class: "kbd" }, ["Shift+Ctrl/⌘ Z"]), " 로 다시 해요."
      ])
    ])
  ]));
}

// ---------- helpers ----------

function section(title: string, children: (Node | string)[]): HTMLElement {
  return el("section", { class: "group" }, [
    el("h2", { class: "group__title" }, [title]),
    el("div", { class: "group__body" }, children)
  ]);
}

function sliderField(
  label: string, value: number, min: number, max: number, step: number, unit: string,
  onChange: (v: number) => void
): HTMLElement {
  const input = el("input", {
    type: "range", class: "slider",
    min: String(min), max: String(max), step: String(step), value: String(value),
    "aria-label": label
  });
  const out = el("span", { class: "readout" }, [`${value}${unit}`]);
  on(input, "input", (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    out.textContent = `${v}${unit}`;
    onChange(v);
  });
  return el("div", { class: "field" }, [
    el("div", { class: "row row--space" }, [
      el("span", { class: "field__label" }, [label]),
      out
    ]),
    input
  ]);
}

function rowField(label: string, control: HTMLElement, init: (c: HTMLElement) => void): HTMLElement {
  init(control);
  return el("div", { class: "row row--space field-row" }, [
    el("span", { class: "field__label" }, [label]),
    control
  ]);
}

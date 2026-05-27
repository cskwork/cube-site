import { el, on, copyText } from "../util/dom";
import {
  applyPreset, defaultState, PRESETS, FACE_LABELS_KO,
  type FaceId, type LiveMode, type PresetId, type Store
} from "../app/state";
import { buildShareUrl } from "../share/hash";
import { toast } from "./toast";

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

type TabId = "deco" | "imprint" | "share";

export function createTools(store: Store): ToolsHandles {
  let activeTab: TabId = "deco";
  const tabBtns: Record<TabId, HTMLButtonElement> = {} as Record<TabId, HTMLButtonElement>;
  const body = el("div", { class: "tools-body" });

  function makeTab(id: TabId, label: string): HTMLButtonElement {
    const b = el("button", {
      type: "button",
      role: "tab",
      "aria-selected": id === activeTab ? "true" : "false"
    }, [label]);
    on(b, "click", () => {
      activeTab = id;
      for (const [k, v] of Object.entries(tabBtns)) v.setAttribute("aria-selected", k === id ? "true" : "false");
      renderBody();
    });
    tabBtns[id] = b;
    return b;
  }

  const tabs = el("div", { class: "tools-tabs", role: "tablist", "aria-label": "꾸미기 도구" }, [
    makeTab("deco", "꾸미기"),
    makeTab("imprint", "글자 새기기"),
    makeTab("share", "공유")
  ]);

  function renderBody(): void {
    body.replaceChildren();
    if (activeTab === "deco") renderDeco(body, store);
    else if (activeTab === "imprint") renderImprint(body, store);
    else renderShare(body, store);
  }

  // Footer row — 초기화 (좌측) · 공유 링크 복사 (우측).
  const resetBtn = el("button", {
    type: "button",
    class: "btn btn--ghost",
    "aria-label": "꾸미기 초기화"
  }, ["초기화"]);
  on(resetBtn, "click", () => {
    if (!confirm("지금 꾸민 큐브를 모두 지우고 처음으로 돌아갈까요?")) return;
    store.set(defaultState());
    toast("초기화 완료");
  });

  const shareBtn = el("button", {
    type: "button",
    class: "btn btn--primary",
    "aria-label": "공유 링크 복사"
  }, ["공유 링크 복사"]);
  on(shareBtn, "click", async () => {
    try {
      await copyText(buildShareUrl(store.get()));
      toast("링크가 복사됐어요. 친구한테 보내봐요.");
    } catch {
      toast("복사 실패. 주소창에서 직접 복사해 주세요.", "warn");
    }
  });

  const footer = el("div", { class: "tools-footer" }, [
    resetBtn,
    shareBtn
  ]);

  const root = el("aside", { class: "tools-panel app-tools", "aria-label": "꾸미기 패널" }, [
    tabs, body, footer
  ]);

  renderBody();
  store.subscribe(() => { if (activeTab !== "share") renderBody(); });

  return { root, refresh: renderBody };
}

// ---------- 꾸미기 ----------

function renderDeco(body: HTMLElement, store: Store): void {
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
          class: "face-pill",
          "aria-pressed": isSel ? "true" : "false",
          "aria-label": `${FACE_LABELS_KO[fid]}면 선택${isLive ? " (입장 면)" : ""}`,
          title: isLive ? "입장 면" : undefined
        }, [isLive ? "★" : String(fid + 1)]);
        on(btn, "click", () => store.update((st) => ({ ...st, selectedFace: fid })));
        return btn;
      })
    )
  ]));

  body.appendChild(section("색상과 효과", [
    sliderField("색조 (Hue)", s.hue, 0, 360, 1, "deg", (v) =>
      store.update((st) => ({ ...st, hue: v }))),
    sliderField("발광 (Glow)", Math.round(s.glow * 100), 0, 100, 1, "%", (v) =>
      store.update((st) => ({ ...st, glow: v / 100 }))),
    sliderField("모서리 둥글기", s.radius, 8, 40, 1, "px", (v) =>
      store.update((st) => ({ ...st, radius: v }))),
    rowField("강조 색", el("input", {
      type: "color",
      class: "swatch",
      value: s.accent,
      "aria-label": "강조 색 선택"
    }), (input) => {
      on(input as HTMLInputElement, "input", (e) => {
        const v = (e.target as HTMLInputElement).value;
        store.update((st) => ({ ...st, accent: v }));
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
        store.update((st) => {
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
      el("span", { class: "muted", style: "font-size:var(--t-12);" }, [
        `이 면 스티커: ${s.faces[s.selectedFace].stickers.length}개`
      ]),
      (() => {
        const b = el("button", { type: "button", class: "btn btn--ghost" }, ["면 스티커 지우기"]);
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
    el("div", { class: "muted", style: "font-size:var(--t-12);" }, [
      "Tip: 큐브를 드래그해 돌리고, ★ 표시된 입장 면의 가운데 알약을 누르면 바로 입장해요."
    ])
  );
}

// ---------- 글자 새기기 ----------

function renderImprint(body: HTMLElement, store: Store): void {
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
      store.update((st) => {
        const fs = st.faces.slice();
        const f = { ...fs[st.selectedFace] };
        delete f.imprint;
        fs[st.selectedFace] = f;
        return { ...st, faces: fs };
      });
      return;
    }
    store.update((st) => {
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
    el("div", { class: "muted", style: "font-size:var(--t-12);" }, [
      "글자는 면 가운데에 새겨져요. 20자까지 가능해요."
    ])
  );
}

// ---------- 공유 ----------

function renderShare(body: HTMLElement, store: Store): void {
  const s = store.get();

  // Site URL input — swap which website renders in the live cube face.
  const urlInput = el("input", {
    type: "url",
    class: "input",
    inputmode: "url",
    autocomplete: "url",
    spellcheck: "false",
    placeholder: "https://example.com",
    value: s.targetUrl,
    "aria-label": "라이브 사이트 URL"
  }) as HTMLInputElement;
  const applyBtn = el("button", { type: "button", class: "btn btn--primary" }, ["적용"]);

  function applyUrl(): void {
    const raw = urlInput.value.trim();
    if (!raw) return;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      new URL(normalized);
    } catch {
      urlInput.setAttribute("aria-invalid", "true");
      return;
    }
    urlInput.removeAttribute("aria-invalid");
    urlInput.value = normalized;
    store.update((st) => ({ ...st, targetUrl: normalized }));
  }
  on(applyBtn, "click", applyUrl);
  on(urlInput, "keydown", (ev) => {
    if ((ev as KeyboardEvent).key === "Enter") applyUrl();
  });

  body.appendChild(section("라이브 사이트 URL", [
    el("div", { class: "row", style: "gap:8px;" }, [urlInput, applyBtn]),
    el("p", { class: "muted", style: "font-size:var(--t-12);margin:0;line-height:1.5;" }, [
      "큐브 안에서 보일 사이트 주소예요. iframe 으로 띄우니까 ",
      el("span", { class: "kbd" }, ["X-Frame-Options: DENY"]),
      " 인 사이트는 비어 보일 수 있어요 — 그땐 ‘스타일 카드’ 모드로 바꿔주세요."
    ])
  ]));

  // Live preview mode toggle.
  const modeWrap = el("div", { class: "row", style: "gap:6px;width:100%;" });
  (["iframe", "card"] as LiveMode[]).forEach((m) => {
    const label = m === "iframe" ? "실제 사이트" : "스타일 카드";
    const b = el("button", {
      type: "button",
      class: "mode-pill",
      "aria-pressed": s.liveMode === m ? "true" : "false",
      "data-mode": m
    }, [label]);
    on(b, "click", () => store.update((st) => ({ ...st, liveMode: m })));
    modeWrap.appendChild(b);
  });

  body.appendChild(section("미리보기 모드", [modeWrap]));

  body.appendChild(section("도움말", [
    el("ul", { class: "muted", style: "font-size:var(--t-14);padding-left:1.1rem;margin:0;line-height:1.7;" }, [
      el("li", {}, ["큐브의 ", el("strong", {}, ["사이트가 보이는 면"]), " 은 진짜 iframe 이라 클릭/스크롤/입력 모두 됩니다."]),
      el("li", {}, ["빈 공간을 드래그하면 큐브가 회전해요."]),
      el("li", {}, ["다른 면을 클릭하면 그 면이 꾸미기 대상이 돼요."]),
      el("li", {}, ["하단 ", el("span", { class: "kbd" }, ["공유 링크 복사"]), " 로 꾸민 큐브 + 사이트 URL 을 통째로 보낼 수 있어요."])
    ])
  ]));
}

// ---------- helpers ----------

function section(title: string, children: (Node | string)[]): HTMLElement {
  return el("section", { class: "field" }, [
    el("div", { class: "field__label" }, [title]),
    el("div", { class: "field", style: "gap:var(--s-3);" }, children)
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
  const out = el("span", {
    class: "muted",
    style: "min-width:54px;text-align:right;font-variant-numeric:tabular-nums;"
  }, [`${value}${unit}`]);
  on(input, "input", (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    out.textContent = `${v}${unit}`;
    onChange(v);
  });
  return el("div", { class: "field" }, [
    el("div", { class: "row row--space" }, [
      el("span", { class: "field__label", style: "letter-spacing:0.08em;" }, [label]),
      out
    ]),
    input
  ]);
}

function rowField(label: string, control: HTMLElement, init: (c: HTMLElement) => void): HTMLElement {
  init(control);
  return el("div", { class: "row row--space" }, [
    el("span", { class: "field__label", style: "letter-spacing:0.08em;" }, [label]),
    control
  ]);
}

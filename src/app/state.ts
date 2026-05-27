/**
 * Single source of truth for the cube portal.
 * Tiny pub-sub store; no framework. Persists to localStorage on every
 * change; serializes to URL hash for sharing.
 */

export type PresetId = "y2k" | "aero" | "pastel" | "holo" | "bento";
export type FaceId = 0 | 1 | 2 | 3 | 4 | 5;
export type LiveMode = "iframe" | "card";

export interface FaceImprint {
  text: string;
  color: string;
  glow: number;       // 0..1
  size: number;       // 12..96
  fontFamily: string; // CSS font-family
}

export interface FaceSticker {
  id: string;
  glyph: string;      // emoji or short string
  u: number;          // 0..1 face coord
  v: number;          // 0..1 face coord
  scale: number;      // 0.4..2.0
  rotation: number;   // degrees
}

export interface FaceState {
  baseColor: string;
  imprint?: FaceImprint;
  stickers: FaceSticker[];
}

export interface AppState {
  version: 1;
  preset: PresetId;
  hue: number;          // 0..360
  glow: number;         // 0..1
  radius: number;       // 8..40
  accent: string;
  fontFamily: string;
  /** Face index for the live target-site face. 0 = +X, 1 = -X, 2 = +Y, 3 = -Y, 4 = +Z, 5 = -Z */
  liveFace: FaceId;
  selectedFace: FaceId;
  faces: FaceState[]; // length 6
  /** Site rendered inside the cube's live face. Runtime-editable in the 공유 tab. */
  targetUrl: string;
  /** Live-face source: real <iframe>, or styled fallback card. */
  liveMode: LiveMode;
  lastSavedAt?: number;
}

export const FACE_LABELS_KO: Record<FaceId, string> = {
  0: "오른",
  1: "왼",
  2: "윗",
  3: "밑",
  4: "앞",
  5: "뒤"
};

export const PRESETS: Record<PresetId, Pick<AppState, "accent" | "hue" | "glow" | "radius" | "fontFamily"> & {
  faceColors: [string, string, string, string, string, string];
  label: string;
}> = {
  y2k: {
    label: "Y2K Cyber",
    accent: "#ff5fa2",
    hue: 320,
    glow: 0.75,
    radius: 24,
    fontFamily: '"Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif',
    faceColors: ["#ff5fa2", "#5ce1ff", "#8c52ff", "#ffd166", "#06d6a0", "#ef476f"]
  },
  aero: {
    label: "Frutiger Aero",
    accent: "#8ecae6",
    hue: 200,
    glow: 0.55,
    radius: 28,
    fontFamily: '"Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif',
    faceColors: ["#bde0fe", "#a2d2ff", "#cdb4db", "#caffbf", "#fdffb6", "#ffadad"]
  },
  pastel: {
    label: "Soft Pastel",
    accent: "#ddb6ff",
    hue: 280,
    glow: 0.35,
    radius: 22,
    fontFamily: '"Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif',
    faceColors: ["#ffe5ec", "#d4f1f4", "#ddb6ff", "#fff1e6", "#e2f0cb", "#c1d8ff"]
  },
  holo: {
    label: "Holographic",
    accent: "#c0c0ff",
    hue: 240,
    glow: 0.85,
    radius: 30,
    fontFamily: '"Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif',
    faceColors: ["#cfd8ff", "#ffd6ff", "#c0f0ff", "#d0ffc0", "#ffe0c0", "#e0c0ff"]
  },
  bento: {
    label: "Bento Minimal",
    accent: "#0b0f1a",
    hue: 0,
    glow: 0.1,
    radius: 12,
    fontFamily: '"Pretendard Variable", "Apple SD Gothic Neo", system-ui, sans-serif',
    faceColors: ["#f6f6f6", "#ececec", "#e0e0e0", "#fafafa", "#f0f0f0", "#dcdcdc"]
  }
};

export function defaultState(): AppState {
  const p = PRESETS.holo;
  return {
    version: 1,
    preset: "holo",
    hue: p.hue,
    glow: p.glow,
    radius: p.radius,
    accent: p.accent,
    fontFamily: p.fontFamily,
    liveFace: 4,
    selectedFace: 4,
    targetUrl: defaultTargetUrl(),
    liveMode: "iframe",
    faces: p.faceColors.map((c) => ({ baseColor: c, stickers: [] }))
  };
}

function defaultTargetUrl(): string {
  try {
    return (typeof __TARGET_SITE__ !== "undefined") ? __TARGET_SITE__.url : "https://example.com";
  } catch {
    return "https://example.com";
  }
}

/** Apply a preset to state without losing user stickers/imprints. */
export function applyPreset(s: AppState, preset: PresetId): AppState {
  const p = PRESETS[preset];
  return {
    ...s,
    preset,
    hue: p.hue,
    glow: p.glow,
    radius: p.radius,
    accent: p.accent,
    fontFamily: p.fontFamily,
    faces: s.faces.map((f, i) => ({ ...f, baseColor: p.faceColors[i] ?? f.baseColor }))
  };
}

export type Listener = (s: AppState) => void;

export class Store {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor(initial: AppState) {
    this.state = initial;
  }

  get(): AppState { return this.state; }

  set(next: AppState): void {
    this.state = { ...next, lastSavedAt: Date.now() };
    for (const l of this.listeners) l(this.state);
  }

  update(mut: (s: AppState) => AppState): void {
    this.set(mut(this.state));
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

const LS_KEY = "ipgyeong-cube.state.v1";

export function loadFromStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return validate(parsed);
  } catch {
    return null;
  }
}

export function saveToStorage(s: AppState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearStorage(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

function validate(s: AppState): AppState {
  // Minimal forward-compat validation. If shape is off, fall back to default.
  if (s?.version !== 1 || !Array.isArray(s.faces) || s.faces.length !== 6) {
    return defaultState();
  }
  if (s.liveMode !== "iframe" && s.liveMode !== "card") {
    s = { ...s, liveMode: "iframe" };
  }
  if (typeof s.targetUrl !== "string" || s.targetUrl.length === 0) {
    s = { ...s, targetUrl: defaultTargetUrl() };
  }
  return s;
}

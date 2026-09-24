/**
 * Undo / redo for the cube.
 *
 * Watches the Store and records a snapshot at the start of every "burst" of
 * meaningful edits. Continuous edits (a slider drag, typing an imprint) that
 * arrive within `idleMs` of each other collapse into one undo step, so one
 * Ctrl+Z undoes a whole drag rather than a single pixel of it.
 *
 * Changing which face is selected is navigation, not an edit: it never
 * creates an undo step on its own.
 */

import type { AppState, Store } from "./state";

export interface HistoryOptions {
  limit?: number;
  idleMs?: number;
  now?: () => number;
}

type Listener = () => void;

/** True when two states differ in something a user would want to undo. */
export function isMeaningfulChange(a: AppState, b: AppState): boolean {
  if (a === b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof AppState>;
  for (const k of keys) {
    if (k === "selectedFace" || k === "lastSavedAt") continue;
    if (a[k] !== b[k]) return true;
  }
  return false;
}

export class History {
  private past: AppState[] = [];
  private future: AppState[] = [];
  private base: AppState;
  private lastEditAt = -Infinity;
  private applying = false;
  private listeners = new Set<Listener>();
  private readonly limit: number;
  private readonly idleMs: number;
  private readonly now: () => number;

  constructor(private readonly store: Store, opts: HistoryOptions = {}) {
    this.limit = opts.limit ?? 60;
    this.idleMs = opts.idleMs ?? 600;
    this.now = opts.now ?? (() => Date.now());
    this.base = store.get();
    store.subscribe((s) => this.onChange(s));
  }

  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }
  get undoDepth(): number { return this.past.length; }
  get redoDepth(): number { return this.future.length; }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Close the current burst so the next edit becomes its own undo step. */
  checkpoint(): void {
    this.lastEditAt = -Infinity;
  }

  undo(): boolean {
    const prev = this.past.pop();
    if (!prev) return false;
    this.future.push(this.store.get());
    this.apply(prev);
    return true;
  }

  redo(): boolean {
    const next = this.future.pop();
    if (!next) return false;
    this.past.push(this.store.get());
    this.apply(next);
    return true;
  }

  private apply(s: AppState): void {
    this.applying = true;
    try {
      this.store.set(s);
    } finally {
      this.applying = false;
    }
    this.base = this.store.get();
    this.lastEditAt = -Infinity;
    this.emit();
  }

  private onChange(s: AppState): void {
    if (this.applying) return;
    if (!isMeaningfulChange(this.base, s)) {
      this.base = s;
      return;
    }
    const t = this.now();
    const continuesBurst = t - this.lastEditAt < this.idleMs;
    if (!continuesBurst) {
      this.past.push(this.base);
      if (this.past.length > this.limit) this.past.shift();
      this.future = [];
    }
    this.lastEditAt = t;
    this.base = s;
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

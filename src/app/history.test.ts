import { describe, it, expect } from "vitest";
import { Store, defaultState, applyPreset } from "./state";
import { History, isMeaningfulChange } from "./history";

function setup(idleMs = 500) {
  let t = 0;
  const store = new Store(defaultState());
  const history = new History(store, { idleMs, now: () => t });
  const advance = (ms: number) => { t += ms; };
  return { store, history, advance };
}

describe("app/history", () => {
  it("undoes and redoes a discrete edit", () => {
    const { store, history, advance } = setup();
    const before = store.get().preset;
    store.update((s) => applyPreset(s, "y2k"));
    expect(history.canUndo).toBe(true);

    advance(1000);
    history.undo();
    expect(store.get().preset).toBe(before);
    expect(history.canRedo).toBe(true);

    history.redo();
    expect(store.get().preset).toBe("y2k");
  });

  it("collapses a continuous slider drag into one undo step", () => {
    const { store, history, advance } = setup(500);
    const startHue = store.get().hue;
    for (let v = 10; v <= 100; v += 10) {
      store.update((s) => ({ ...s, hue: v }));
      advance(16);
    }
    expect(history.undoDepth).toBe(1);
    history.undo();
    expect(store.get().hue).toBe(startHue);
  });

  it("starts a new step after the idle gap", () => {
    const { store, history, advance } = setup(500);
    store.update((s) => ({ ...s, hue: 10 }));
    advance(900);
    store.update((s) => ({ ...s, hue: 20 }));
    expect(history.undoDepth).toBe(2);
    history.undo();
    expect(store.get().hue).toBe(10);
  });

  it("does not record face selection as an undo step", () => {
    const { store, history } = setup();
    store.update((s) => ({ ...s, selectedFace: 0 }));
    expect(history.canUndo).toBe(false);
    const d = defaultState();
    expect(isMeaningfulChange(d, { ...d, selectedFace: 1 })).toBe(false);
    expect(isMeaningfulChange(d, { ...d, hue: d.hue + 1 })).toBe(true);
  });

  it("makes a reset undoable", () => {
    const { store, history, advance } = setup();
    store.update((s) => ({ ...s, targetUrl: "https://wikipedia.org" }));
    advance(1000);
    store.set(defaultState());
    history.undo();
    expect(store.get().targetUrl).toBe("https://wikipedia.org");
  });

  it("clears the redo stack when a new edit happens", () => {
    const { store, history, advance } = setup();
    store.update((s) => ({ ...s, hue: 10 }));
    advance(1000);
    history.undo();
    expect(history.canRedo).toBe(true);
    advance(1000);
    store.update((s) => ({ ...s, hue: 99 }));
    expect(history.canRedo).toBe(false);
  });

  it("caps the stack at the limit", () => {
    let t = 0;
    const store = new Store(defaultState());
    const history = new History(store, { limit: 3, idleMs: 10, now: () => t });
    for (let i = 0; i < 8; i++) {
      t += 100;
      store.update((s) => ({ ...s, hue: i }));
    }
    expect(history.undoDepth).toBe(3);
  });
});

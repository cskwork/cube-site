import { describe, it, expect } from "vitest";
import { Store, defaultState } from "../app/state";
import { createTools } from "./tools";

/**
 * Regression guard for the tools panel rebuild bug: a continuous in-panel
 * edit (slider drag, color scrub, imprint typing) used to trigger a full
 * DOM rebuild via the store subscriber, replacing the very <input> being
 * edited — killing slider pointer-capture and stealing text focus. The fix
 * routes those edits through live(), which suppresses the rebuild, while
 * external state changes (cube face click, reset) must still rebuild.
 */
function fireInput(node: Element, value?: string): void {
  if (value !== undefined) (node as HTMLInputElement).value = value;
  node.dispatchEvent(new Event("input", { bubbles: true }));
}

function clickTab(root: HTMLElement, index: number): void {
  const tabs = root.querySelectorAll('[role="tab"]');
  (tabs[index] as HTMLButtonElement).dispatchEvent(new Event("click", { bubbles: true }));
}

describe("ui/tools rebuild behavior", () => {
  it("keeps the same slider element across a drag (no mid-edit rebuild)", () => {
    const store = new Store(defaultState());
    const { root } = createTools(store);

    const slider = root.querySelector(".slider");
    expect(slider).not.toBeNull();

    fireInput(slider!, "180"); // simulate one drag tick → live() update
    expect(root.contains(slider!)).toBe(true); // element survived, not replaced
  });

  it("keeps the same imprint text field across typing (focus preserved)", () => {
    const store = new Store(defaultState());
    const { root } = createTools(store);
    clickTab(root, 1); // switch to 글자 새기기

    const textInput = root.querySelector('input[type="text"]');
    expect(textInput).not.toBeNull();

    fireInput(textInput!, "내 큐브");
    expect(root.contains(textInput!)).toBe(true);
  });

  it("still rebuilds the panel on an external state change (cube face click)", () => {
    const store = new Store(defaultState());
    const { root } = createTools(store);

    const slider = root.querySelector(".slider");
    // An external update (e.g. selecting a different face on the cube) goes
    // through store.update directly, NOT live() — the panel must rebuild so it
    // reflects the newly-selected face.
    store.update((st) => ({ ...st, selectedFace: 0 }));
    expect(root.contains(slider!)).toBe(false); // old DOM was rebuilt
  });
});

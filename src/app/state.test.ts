import { describe, it, expect } from "vitest";
import { defaultState, validate, type AppState, type FaceState } from "./state";

/**
 * validate() is the single trust boundary for state arriving from
 * localStorage or a shared URL hash. These cases reproduce the exact
 * corruptions that used to crash the render loop / repaint pipeline.
 */
describe("state/validate", () => {
  it("clamps an out-of-range liveFace to a valid FaceId", () => {
    const s = { ...defaultState(), liveFace: 9 as AppState["liveFace"] };
    expect(validate(s).liveFace).toBe(4);
  });

  it("clamps a negative / non-integer selectedFace to a valid FaceId", () => {
    expect(validate({ ...defaultState(), selectedFace: -1 as AppState["selectedFace"] }).selectedFace).toBe(4);
    expect(validate({ ...defaultState(), selectedFace: 2.5 as AppState["selectedFace"] }).selectedFace).toBe(4);
  });

  it("backfills a face that is missing its stickers array", () => {
    const s = defaultState();
    // Simulate a legacy/corrupt face object with no stickers property.
    s.faces[1] = { baseColor: "#fff" } as FaceState;
    const out = validate(s);
    expect(Array.isArray(out.faces[1].stickers)).toBe(true);
    expect(out.faces[1].stickers).toEqual([]);
  });

  it("does not mutate the input state (immutability)", () => {
    const s = defaultState();
    const before = JSON.parse(JSON.stringify(s));
    s.liveFace = 9 as AppState["liveFace"];
    const snapshot = JSON.parse(JSON.stringify(s));
    validate(s);
    expect(s).toEqual(snapshot); // validate returned a copy; input untouched
    expect(before.liveFace).toBe(4);
  });

  it("falls back to default when the shape is fundamentally broken", () => {
    const broken = { version: 1, faces: [] } as unknown as AppState;
    expect(validate(broken).faces.length).toBe(6);
  });

  it("leaves a valid state's face indices intact", () => {
    const s = { ...defaultState(), liveFace: 2 as AppState["liveFace"], selectedFace: 5 as AppState["selectedFace"] };
    const out = validate(s);
    expect(out.liveFace).toBe(2);
    expect(out.selectedFace).toBe(5);
  });

  it("repairs a face that is missing its baseColor (would crash hexToRgb)", () => {
    const s = defaultState();
    s.faces[2] = { stickers: [] } as unknown as FaceState;
    const out = validate(s);
    expect(typeof out.faces[2].baseColor).toBe("string");
    expect(out.faces[2].baseColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("repairs a null face entry without dropping baseColor", () => {
    const s = defaultState();
    s.faces[0] = null as unknown as FaceState;
    const out = validate(s);
    expect(out.faces[0]).toBeTruthy();
    expect(out.faces[0].baseColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(Array.isArray(out.faces[0].stickers)).toBe(true);
  });

  it("rejects a CSS-injection accent and falls back to a safe hex color", () => {
    const s = { ...defaultState(), accent: "#000;}@import url(evil)" };
    const out = validate(s);
    expect(out.accent).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    expect(out.accent).not.toContain("@import");
  });

  it("sanitizes a non-hex imprint color", () => {
    const s = defaultState();
    s.faces[1].imprint = { text: "hi", color: "red;}*{}", glow: 0.4, size: 40, fontFamily: "system-ui" };
    expect(validate(s).faces[1].imprint!.color).toBe("#ffffff");
  });
});

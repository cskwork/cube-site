import { describe, it, expect } from "vitest";
import { defaultState, applyPreset } from "../app/state";
import { stateToHash, hashToState, buildShareUrl } from "./hash";

describe("share/hash", () => {
  it("roundtrips a fresh default state", () => {
    const s = defaultState();
    const out = hashToState(stateToHash(s));
    expect(out).not.toBeNull();
    expect(out!.preset).toBe(s.preset);
    expect(out!.faces.length).toBe(6);
  });

  it("preserves preset + sticker placement", () => {
    let s = defaultState();
    s = applyPreset(s, "y2k");
    s.faces[2].stickers.push({ id: "x", glyph: "★", u: 0.4, v: 0.5, scale: 1.2, rotation: 12 });
    s.faces[3].imprint = { text: "안녕!", color: "#ff0", glow: 0.5, size: 36, fontFamily: "system-ui" };
    const out = hashToState(stateToHash(s));
    expect(out).not.toBeNull();
    expect(out!.preset).toBe("y2k");
    expect(out!.faces[2].stickers[0].glyph).toBe("★");
    expect(out!.faces[3].imprint?.text).toBe("안녕!");
  });

  it("rejects malformed hashes", () => {
    expect(hashToState("")).toBeNull();
    expect(hashToState("#cube=NOT_BASE64$$$")).toBeNull();
    expect(hashToState("#other=abc")).toBeNull();
  });

  it("stays under 2KB for a typical decorated state (2 stickers/face + 2 imprints)", () => {
    // A realistic share: a couple of stickers per face, imprint on 2 faces.
    let s = defaultState();
    s = applyPreset(s, "holo");
    for (let i = 0; i < 6; i++) {
      const fi = i as 0 | 1 | 2 | 3 | 4 | 5;
      for (let k = 0; k < 2; k++) {
        s.faces[fi].stickers.push({
          id: `s${i}${k}`, glyph: "🌸",
          u: Math.random(), v: Math.random(),
          scale: 1, rotation: 0
        });
      }
    }
    s.faces[0].imprint = { text: "내 큐브 ✨", color: "#ffffff", glow: 0.5, size: 48, fontFamily: "system-ui" };
    s.faces[3].imprint = { text: "안녕!", color: "#ffd166", glow: 0.7, size: 56, fontFamily: "system-ui" };
    const hash = stateToHash(s);
    expect(hash.length).toBeLessThan(2048);
  });

  it("stays under 4KB even for a heavily decorated state (4 stickers/face + 6 imprints)", () => {
    let s = defaultState();
    s = applyPreset(s, "holo");
    for (let i = 0; i < 6; i++) {
      const fi = i as 0 | 1 | 2 | 3 | 4 | 5;
      for (let k = 0; k < 4; k++) {
        s.faces[fi].stickers.push({
          id: `s${i}${k}`, glyph: "🌸",
          u: Math.random(), v: Math.random(),
          scale: 1, rotation: 0
        });
      }
      s.faces[fi].imprint = {
        text: "꾸미기", color: "#ffffff",
        glow: 0.5, size: 32, fontFamily: "system-ui"
      };
    }
    const hash = stateToHash(s);
    expect(hash.length).toBeLessThan(4096);
  });

  it("buildShareUrl produces a URL with the encoded hash", () => {
    // happy-dom provides a usable location object.
    const s = defaultState();
    const url = buildShareUrl(s);
    expect(url.includes("#cube=")).toBe(true);
  });

  it("roundtrips the runtime-set targetUrl + liveMode", () => {
    const s = defaultState();
    s.targetUrl = "https://wikipedia.org";
    s.liveMode = "card";
    const out = hashToState(stateToHash(s));
    expect(out).not.toBeNull();
    expect(out!.targetUrl).toBe("https://wikipedia.org");
    expect(out!.liveMode).toBe("card");
  });
});

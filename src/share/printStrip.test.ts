import { describe, it, expect } from "vitest";
import { STRIP, hostOf, stampText, stripAngles, stripFileName, stripLayout } from "./printStrip";

describe("share/printStrip", () => {
  it("lays out four equal frames above the footer band", () => {
    const frames = stripLayout();
    expect(frames).toHaveLength(4);
    const last = frames[3];
    expect(last.y + last.h).toBeLessThanOrEqual(STRIP.height - STRIP.footer);
    expect(new Set(frames.map((f) => f.h)).size).toBe(1);
    for (let i = 1; i < 4; i++) expect(frames[i].y).toBeGreaterThan(frames[i - 1].y + frames[i - 1].h);
  });

  it("shoots four distinct angles, the first straight at the live face", () => {
    const angles = stripAngles(4);
    expect(angles).toHaveLength(4);
    expect(angles[0][0]).toBeCloseTo(0);
    expect(angles[0][1]).toBeCloseTo(0);
    const keys = new Set(angles.map((a) => a.map((n) => n.toFixed(2)).join(",")));
    expect(keys.size).toBe(4);
  });

  it("formats a stable file name and stamp", () => {
    const d = new Date(2026, 8, 4, 7, 5);
    expect(stripFileName(d)).toBe("cube-site-20260904-0705.png");
    expect(stampText(d)).toBe("2026.09.04 07:05");
  });

  it("shows the bare host of the live site", () => {
    expect(hostOf("https://www.example.com/path")).toBe("example.com");
    expect(hostOf("not a url")).toBe("not a url");
  });
});

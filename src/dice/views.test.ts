import { describe, it, expect } from "vitest";
import {
  angleDelta, frontOf, fromSpherical, orbit, overviewOf, slerpPosition, toSpherical, type Vec3
} from "./views";

const len = (v: Vec3) => Math.hypot(...v);
const close = (a: Vec3, b: Vec3, eps = 1e-6) => a.every((x, i) => Math.abs(x - b[i]) < eps);

describe("dice/views", () => {
  it("round-trips spherical coordinates", () => {
    const p: Vec3 = [1.2, 0.8, -2.1];
    expect(close(fromSpherical(toSpherical(p)), p)).toBe(true);
  });

  it("puts the camera on the live face's normal for the front view", () => {
    expect(close(frontOf(4, 3.6), [0, 0, 3.6])).toBe(true);
    expect(close(frontOf(1, 3.6), [-3.6, 0, 0])).toBe(true);
    // Top face: slightly off the pole but essentially above.
    const top = frontOf(2, 3.6);
    expect(top[1]).toBeGreaterThan(3.59);
  });

  it("overview keeps the live face toward the camera but oblique", () => {
    for (let f = 0; f < 6; f++) {
      const cam = overviewOf(f, 3.6);
      const n = frontOf(f, 1);
      const dot = (cam[0] * n[0] + cam[1] * n[1] + cam[2] * n[2]) / len(cam);
      expect(dot).toBeGreaterThan(0.45); // still facing the camera
      expect(dot).toBeLessThan(0.95);    // but not straight on
    }
  });

  it("takes the shortest way round", () => {
    expect(angleDelta(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2);
    const mid = slerpPosition([0, 0, 3], [3, 0, 0], 0.5);
    expect(len(mid)).toBeCloseTo(3);
    expect(mid[0]).toBeGreaterThan(0);
    expect(mid[2]).toBeGreaterThan(0);
  });

  it("orbits by a quarter turn", () => {
    const p = orbit([0, 0, 3], Math.PI / 2, 0);
    expect(close(p, [3, 0, 0], 1e-9)).toBe(true);
  });
});

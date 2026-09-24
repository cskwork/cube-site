import { describe, it, expect } from "vitest";
import { normalizeUrl } from "./stage";

describe("ui/stage normalizeUrl", () => {
  it("adds https to a bare host", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
    expect(normalizeUrl("  wikipedia.org/wiki/Cube ")).toBe("https://wikipedia.org/wiki/Cube");
  });
  it("keeps explicit http(s) URLs", () => {
    expect(normalizeUrl("http://localhost:5173/x")).toBe("http://localhost:5173/x");
  });
  it("rejects empty, non-web schemes and hostless input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("data:text/html,hi")).toBeNull();
    expect(normalizeUrl("hello")).toBeNull();
  });
});

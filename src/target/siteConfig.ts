/**
 * Build-time site configuration.
 *
 * All fields originate from `.env` (see .env.example) and are injected
 * by Vite via `define` as `__TARGET_SITE__`. Any website can be wired
 * in by changing TARGET_URL + the cosmetic fields — no code changes.
 */

export interface TargetSite {
  url: string;
  name: string;
  title: string;
  sub: string;
  chips: string[];
  ctaLabel: string;
  tagline: string;
}

let _cached: TargetSite | null = null;

export function getTargetSite(): TargetSite {
  if (_cached) return _cached;
  const raw = (typeof __TARGET_SITE__ !== "undefined")
    ? __TARGET_SITE__
    : {
        url: "https://example.com",
        name: "Example",
        title: "여기로 입장하기",
        sub: "환경을 골라서 입장해 보세요.",
        chips: "준비됨",
        ctaLabel: "입장하기",
        tagline: "3D 입장 포털"
      };
  _cached = {
    url: raw.url,
    name: raw.name,
    title: raw.title.replace(/\\n/g, "\n"),
    sub: raw.sub.replace(/\\n/g, "\n"),
    chips: raw.chips.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4),
    ctaLabel: raw.ctaLabel,
    tagline: raw.tagline
  };
  return _cached;
}

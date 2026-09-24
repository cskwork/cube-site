---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["src/ui/tools.ts","src/styles/components.css"]
---

# Surface brief: Cube Site app shell

Scope: the single-screen app (stage + tools) at `/`. Visitor mode: **Operate** (decorate a cube, use a live site on it, share it).
Audience and job: see PRODUCT.md. Constraints: tests index tabs 0/1/2 (꾸미기 / 글자 새기기 / 공유); iframe interaction must keep working; honest HTML-in-Canvas gating.

Unattended run: owner said "권장대로 승인 진행하기". The seed-assigned direction was built without a decision page; build path is code-led (stated, not stored).

## Direction contract

THESIS: The app is a 인생네컷-style photo-booth kiosk for a website. Pick the site, decorate the cube, print a four-cut strip. It refuses the dark glass dev-playground with neon glow that every WebGL demo ships.

OWN-WORLD: A glossy cobalt kiosk body holds a pale grey backdrop-sweep viewfinder with a thick rounded bezel. Controls are chunky white kiosk keys with a 2px ink outline and a pressed-in state. There is one lemon "출력" key, and step numerals are set in Do Hyeon. The only paper is the print strip: white stock, thin ink frame, a date stamp. Selection is marked with a notch and outline, never by hue alone.

STORY: The visitor sees a real cube holding a real site, learns they can turn it and dress it, and leaves with a link or a four-cut image.

FIRST VIEWPORT: On desktop, the viewfinder takes about 64% on the left with the address strip (URL, apply, mode) across its top and view keys along its bottom. The kiosk panel on the right shows the step rail ① 꾸미기 ② 글자 ③ 출력, the active step's controls, and a footer with undo/redo, reset and the lemon 공유 key. On mobile, the viewfinder takes the top ~52% and the panel stacks below as a bottom sheet.

FORM: 인생네컷 photo-booth kiosk, position 3 of 7 on the grounded list, seed key 6467dd88.
RAISE (variety telop, competitive): status and toast captions use outlined, high-chroma type that stays legible over any site in the frame.
RAISE (flash-scrawl sleeve, declined): every edit leaves a mark. The history counter shows undo/redo depth, and used state stays visible.
RAISE (cutting bench, declined): one mark vocabulary for state. Selected means notch plus outline, disabled means dashed, busy means the ticking numeral.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

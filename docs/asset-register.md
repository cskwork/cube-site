# Asset register

Raster assets shipped in `public/img/`. All three were generated on 2026-09-24 with GPT Image 2 (ChatGPT Images 2.0), run through the local Codex CLI on the owner's ChatGPT plan, and then optimized with ImageMagick. The exact prompts are embedded in the files: a JPEG comment for `og.jpg`, and `*.webp.json` sidecars for the WebP files.

| File | Size | Used for | Alt text |
|---|---|---|---|
| `og.jpg` | 1200×630 JPEG q84, 92 KB | `og:image` / Twitter card in `index.html` | 파란 사진 부스 화면 속에 스티커로 꾸민 큐브가 떠 있고, 옆 출력구로 네컷 사진 띠가 나오는 그림 |
| `print-empty.webp` | 320×320 WebP with alpha, 9 KB | Empty state of 공유 → 네컷 출력 (`src/ui/printPanel.ts`) | 파란 출력구에서 빈 네컷 사진 띠가 반쯤 나온 그림 |
| `coach.webp` | 160×160 WebP, 4 KB | First-visit coach card in the viewfinder (`src/ui/stage.ts`) | decorative (`alt=""`); the card text carries the message |

Notes

- The illustrations are synthetic. They show the product idea and are not screenshots of real output.
- The "Cube Site" lettering in `og.jpg` was drawn by the image model.
- The first OG generation returned an unrelated image (an image from another concurrent Codex session was picked up). It was discarded and regenerated. Check any future generation visually before shipping it.

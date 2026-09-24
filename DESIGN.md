---
name: Cube Site
description: A photo-booth kiosk for a website. Put a live site on a cube, decorate it, print a four-cut strip.
colors:
  kiosk: "#2340ff"
  kiosk-deep: "#1a2fd1"
  on-kiosk: "#ffffff"
  on-kiosk-2: "#d8ddff"
  panel: "#ffffff"
  panel-2: "#f3f4f9"
  backdrop: "#e9ebf2"
  backdrop-2: "#d6d9e7"
  ink: "#0e1330"
  ink-2: "#464c6e"
  ink-3: "#5f6688"
  line: "#d5d8e5"
  lemon: "#ffe14d"
  lemon-deep: "#f2c800"
  cobalt-soft: "#e3e7ff"
  danger: "#c8243f"
  kiosk-night: "#111a78"
  panel-night: "#12163a"
  ink-night: "#f2f3fa"
typography:
  display:
    fontFamily: "Do Hyeon, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.01em"
  caption:
    fontFamily: "Do Hyeon, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Pretendard Variable, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Pretendard Variable, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Pretendard Variable, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  field: "10px"
  key: "14px"
  card: "18px"
  screen: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "28px"
components:
  key:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "0 16px"
    height: "44px"
  key-lemon:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    height: "44px"
  key-lemon-hover:
    backgroundColor: "{colors.lemon-deep}"
  key-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.key}"
  step-selected:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    height: "48px"
  step:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.key}"
    height: "48px"
  face-pill-selected:
    backgroundColor: "{colors.kiosk}"
    textColor: "{colors.on-kiosk}"
    rounded: "{rounded.field}"
    height: "44px"
  toast:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.key}"
---

# Design System: Cube Site

## Overview

Cube Site is designed as a 인생네컷-style photo-booth kiosk that happens to hold a website. The page is the kiosk body, a glossy cobalt field that fills the whole viewport. Two screens sit on it. The **viewfinder** is a pale backdrop sweep behind the 3D cube, inside a thick bezel. The **control screen** is a white panel that walks you through three booth steps: ① 꾸미기 → ② 글자 새기기 → ③ 공유. The one paper object in the system is the **print strip**: a white 600×1800 four-cut photo of the cube.

This is an Operate surface. Expression lives in the key caps, the notch marks and the print, and never in the way of the task. The five cube skins (Y2K Cyber, Frutiger Aero, Soft Pastel, Holographic, Bento Minimal) are content the user applies to the cube, not the app's own look.

Light is the booth in daylight. Dark (`prefers-color-scheme: dark`) is the same booth at night: a deep cobalt body, a navy screen, and the same lemon.

## Colors

- **Kiosk cobalt** `#2340ff` covers most of the viewport (Committed strategy). White on cobalt is 6.5:1.
- **Lemon** `#ffe14d` is the single action colour: 공유 링크 복사, 네컷 출력, the toast caption, and the selection notch. Text on lemon is always ink.
- **Ink** `#0e1330` is used for text, outlines on key caps, and the dark "띄우기" key.
- **Backdrop** `#e9ebf2` / `#d6d9e7` is the viewfinder sweep and the print frames.
- Secondary text is tinted from the ink hue (`#464c6e`, `#5f6688`), never neutral grey. Both pass 4.5:1 on white and on `panel-2`.

### Named Rules

- **One lemon.** A screen shows lemon on at most one primary key, plus notches. Two lemon keys means one of them is wrong.
- **Selection is a mark.** A selected item gets an outline **and** a lemon notch or dot (steps, segment, presets), or a cobalt fill with an ink outline (face pills). Colour alone never carries state.
- **Disabled is dashed.** Unavailable keys and gated modes switch to a dashed border. Opacity alone is not used.

## Typography

- **Do Hyeon** (self-hosted through `@fontsource/do-hyeon`, unicode-range subsets) is Korean kiosk-signage lettering. Use it only for the wordmark, step numerals, the undo-depth counter, toast captions, and the print strip. Never use it for labels, buttons or body text.
- The **UI stack** (Pretendard if installed, then Apple SD Gothic Neo / Noto Sans KR / system) sets everything else. Labels are 13px/700, group titles 15px/800, body 14px/1.6.
- The type scale is fixed in rem (Operate), with no fluid headings.

## Layout

- **Desktop (>960px):** a two-column grid, `minmax(0,1fr) clamp(340px, 30vw, 420px)`, 20px gutters, full viewport height, with no page scroll. The stage rows are address strip / viewfinder / view keys.
- **≤960px:** the stage sticks to the top (`min(56svh, 600px)`, min 380px). The control screen scrolls under it as a bottom sheet with a sticky footer. The mode segment drops to its own row.
- **≤420px:** key labels collapse to icons (every one keeps an `aria-label`). The status chip keeps only its dot and link.
- The rhythm is 4pt-based (4, 8, 12, 16, 20, 28). Groups inside a step are 28px apart, and a group title sits 12px above its controls.

## Elevation & Depth

- **Key lip:** `inset 0 -3px 0 rgba(14,19,48,.14)` gives every key cap a pressed-plastic bottom edge. Pressing a key removes the lip and moves it 1px down.
- **Screen lift:** `0 18px 40px -22px rgba(6,10,70,.6)` goes under the control screen and the print strip.
- **Bezel:** the viewfinder uses an inset 2px `kiosk-deep` ring plus a soft inner top shadow. The live-site iframe gets a 2px ink ring and a soft drop.
- No glass, no glows, no zero-blur block shadows.

## Shapes

Radii grow with the object's size: fields 10–12px, keys 14px, cards and the print tray 18px, screens 28px (22–24px on phones). Circles are used only for step numerals and status dots.

## Components

- **Key** (`.key`): 44px minimum, 2px ink outline, key lip. Variants: `--lemon` (primary), `--ink` (the address 띄우기 key; it turns lemon at night), `--ghost` (reset), `--icon` (44×44), `--small`.
- **Address strip:** a white field with an ink outline and a cobalt live-site glyph, followed by 띄우기. Errors appear in a white caption chip below it, in danger red.
- **Mode segment:** sits on `kiosk-deep`. The selected option is white with an ink outline and a lemon notch. The gated HTML-in-Canvas option is dashed.
- **Step rail:** three equal tabs, each with a Do Hyeon numeral in a ring. The selected tab has a white cap, an ink outline, a cobalt filled numeral, and a lemon notch below it. Arrow keys move between tabs.
- **Face pills:** six labels (오른/왼/윗/밑/앞/뒤). The live face carries the authored browser-window icon.
- **Toast (telop caption):** a lemon pill at the bottom centre with a 2px ink outline and Do Hyeon text. It can carry one action (되돌리기).
- **Print tray:** a backdrop-coloured tray. Before the first print it shows the empty-strip illustration. A fresh print feeds in with the single authored motion (clip-path reveal and a 36px drop, 1.2s ease-out).
- **Icons:** the authored set in `src/ui/icons.ts` (24px grid, 2px round stroke). Emoji appear only as sticker content.

## Do's and Don'ts

- Do keep the cube visible as a 3D object. The first view starts on the shoulder, then turns to face the site.
- Do give every new control a key-cap shape, a 44px target, and a visible focus ring (lemon plus ink on cobalt, cobalt inside the control screen).
- Do write copy in the product's own Korean voice: short, friendly, and naming the action.
- Don't add a second saturated accent, gradient text, glass panels, or neon glows. That is the old dev-playground look this world replaced.
- Don't use Do Hyeon for labels or body text.
- Don't signal state with colour alone.

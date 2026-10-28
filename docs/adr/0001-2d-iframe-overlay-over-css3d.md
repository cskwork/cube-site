# 0001. Track the live face with a flat 2D iframe instead of CSS3DRenderer

Status: accepted (implemented in `7a8ea88`, refined in `81769f5`)

## Context

The live face of the cube must show a real, interactive website. Three.js offers `CSS3DRenderer`, which places DOM elements (including an `<iframe>`) in 3D with CSS transforms. In Chrome, hit-testing for iframes under CSS 3D transforms was unreliable: the site loaded, but clicks and typing silently failed (see the header comment in `src/dice/scene.ts`).

## Decision

Render the cube with `WebGLRenderer` only, and lay a normal 2D `<iframe>` over the canvas. Each frame, `syncIframeRect()` in `src/dice/scene.ts` projects the live face's four corners to screen space and sizes the iframe to their bounding box. The iframe is hidden while the user drags, during camera tweens, and whenever the face is not pointing at the camera (`IFRAME_FACING_DOT = -0.8`); the WebGL face, painted by `src/dice/faceTextures.ts`, shows through instead.

## Consequences

- Interaction inside the site (click, scroll, type, submit) works the same as in any iframe.
- The iframe cannot tilt with the cube. At oblique angles it would float as a rectangle, so it is hidden and the painted face is shown. Commit `81769f5` added the facing threshold for exactly this.
- The live site cannot be captured into the photo strip (cross-origin), so `captureViews` renders the painted face.

## Alternatives considered

- `CSS3DRenderer` with a 3D-transformed iframe: rejected because of the input hit-testing failures above.
- Static screenshot of the site on the face: loses interactivity, which is the point of the app. A Canvas2D "style card" (`liveMode: "card"`) is kept only as a fallback for sites that refuse framing.

/**
 * Three.js dice scene with a 2D iframe HUD that tracks the live face.
 *
 * The cube is fully 3D (WebGLRenderer) and rotates freely. The interactive
 * site lives in a regular 2D <iframe> overlaid on top of the canvas,
 * positioned + sized each frame to match the screen-space bounding rect
 * of the cube's live face. We chose this over CSS3DRenderer because
 * Chrome's CSS-3D hit-testing for iframes is unreliable — sites loaded
 * but clicks/typing silently failed. A plain 2D iframe gives bullet-proof
 * interaction at the cost of not tilting with the cube at oblique angles.
 *
 * When the live face rotates away from the camera the iframe is hidden
 * via `display: none`, revealing the WebGL face decoration behind it.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FaceTexture } from "./faceTextures";

const CUBE_SIZE = 1.6;
const HALF = CUBE_SIZE / 2;

export interface SceneHandles {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cube: THREE.Mesh;
  controls: OrbitControls;
  iframe: HTMLIFrameElement;
  setIframeVisible(visible: boolean): void;
  setLiveFace(faceId: number): void;
  setTargetUrl(url: string): void;
  setIdleSpin(on: boolean): void;
  pickFace(clientX: number, clientY: number): { faceId: number; u: number; v: number } | null;
  dispose(): void;
}

/**
 * Face corners in cube-local space. Order: +X, -X, +Y, -Y, +Z, -Z.
 * Each face is a 1.6×1.6 square; we list its 4 corners CCW.
 */
const FACE_CORNERS: ReadonlyArray<ReadonlyArray<readonly [number, number, number]>> = [
  // +X (y, z) plane at x = +HALF
  [[HALF, -HALF, -HALF], [HALF, HALF, -HALF], [HALF, HALF, HALF], [HALF, -HALF, HALF]],
  // -X
  [[-HALF, -HALF, HALF], [-HALF, HALF, HALF], [-HALF, HALF, -HALF], [-HALF, -HALF, -HALF]],
  // +Y
  [[-HALF, HALF, HALF], [HALF, HALF, HALF], [HALF, HALF, -HALF], [-HALF, HALF, -HALF]],
  // -Y
  [[-HALF, -HALF, -HALF], [HALF, -HALF, -HALF], [HALF, -HALF, HALF], [-HALF, -HALF, HALF]],
  // +Z
  [[-HALF, -HALF, HALF], [HALF, -HALF, HALF], [HALF, HALF, HALF], [-HALF, HALF, HALF]],
  // -Z
  [[HALF, -HALF, -HALF], [-HALF, -HALF, -HALF], [-HALF, HALF, -HALF], [HALF, HALF, -HALF]]
];

const FACE_NORMALS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1]
];

export function createScene(
  container: HTMLElement,
  faces: FaceTexture[],
  initialLiveFace: number,
  initialTargetUrl: string
): SceneHandles {
  // ---------- camera ----------
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 3.6);
  camera.lookAt(0, 0, 0);

  // ---------- WebGL scene ----------
  const scene = new THREE.Scene();
  scene.background = null;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.45);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const geo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
  const materials = faces.map((f) =>
    new THREE.MeshStandardMaterial({
      map: f.texture,
      roughness: 0.42,
      metalness: 0.18
    })
  );
  const cube = new THREE.Mesh(geo, materials);
  scene.add(cube);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.classList.add("stage-canvas");
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "3D 사이트 큐브");
  container.appendChild(renderer.domElement);

  // ---------- 2D iframe HUD ----------
  const iframe = document.createElement("iframe");
  iframe.className = "stage-iframe";
  iframe.src = initialTargetUrl;
  iframe.setAttribute("referrerpolicy", "no-referrer");
  iframe.setAttribute("title", "라이브 사이트");
  iframe.setAttribute(
    "allow",
    "accelerometer; autoplay; camera; clipboard-read; clipboard-write; encrypted-media; fullscreen; gyroscope; microphone; picture-in-picture; web-share"
  );
  container.appendChild(iframe);

  // Same-origin best-effort: keep target=_blank links inside the cube.
  iframe.addEventListener("load", () => {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      if (doc.querySelector('base[data-cube-injected="1"]')) return;
      const base = doc.createElement("base");
      base.setAttribute("target", "_self");
      base.setAttribute("data-cube-injected", "1");
      doc.head.insertBefore(base, doc.head.firstChild);
    } catch {
      /* cross-origin → out of reach by spec; new tabs are unavoidable */
    }
  });

  // ---------- controls ----------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.32;
  controls.enablePan = false;
  controls.minDistance = 2.4;
  controls.maxDistance = 6;
  controls.target.set(0, 0, 0);

  // While the user is actively rotating, hide the iframe to avoid the
  // visual lag of it tracking a fast-moving face — and so OrbitControls
  // gets clean drag events anywhere on the stage.
  let rotating = false;
  controls.addEventListener("start", () => { rotating = true; });
  controls.addEventListener("end", () => { rotating = false; });

  // ---------- idle spin: OFF by default ----------
  // The cube no longer auto-spins. Reliable iframe interaction beats
  // ambient motion; user-driven drag remains.
  let idleSpinAllowed = false;

  // ---------- resize ----------
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  function resize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();

  // ---------- live face state ----------
  let currentLiveFace = initialLiveFace;
  let iframeVisibleRequested = true;
  const projected = new THREE.Vector3();
  const cornerWorld = new THREE.Vector3();
  const faceNormalWorld = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  function syncIframeRect(): void {
    if (!iframeVisibleRequested || rotating) {
      if (iframe.style.display !== "none") iframe.style.display = "none";
      return;
    }
    cube.updateWorldMatrix(true, false);

    // Is the live face facing the camera?
    const normal = FACE_NORMALS[currentLiveFace];
    faceNormalWorld.set(normal[0], normal[1], normal[2]);
    cube.getWorldQuaternion(_tmpQuat).normalize();
    faceNormalWorld.applyQuaternion(_tmpQuat);
    camera.getWorldDirection(camDir);
    const facing = faceNormalWorld.dot(camDir) < -0.05; // small margin to avoid jitter at near-90°

    if (!facing) {
      if (iframe.style.display !== "none") iframe.style.display = "none";
      return;
    }

    // Project the 4 face corners to screen space.
    const corners = FACE_CORNERS[currentLiveFace];
    const w = container.clientWidth;
    const h = container.clientHeight;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let anyBehindCamera = false;
    for (const c of corners) {
      cornerWorld.set(c[0], c[1], c[2]).applyMatrix4(cube.matrixWorld);
      projected.copy(cornerWorld).project(camera);
      if (projected.z >= 1) { anyBehindCamera = true; break; }
      const px = (projected.x + 1) * 0.5 * w;
      const py = (1 - (projected.y + 1) * 0.5) * h;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    if (anyBehindCamera) {
      if (iframe.style.display !== "none") iframe.style.display = "none";
      return;
    }

    const left = Math.round(minX);
    const top = Math.round(minY);
    const width = Math.max(1, Math.round(maxX - minX));
    const height = Math.max(1, Math.round(maxY - minY));
    iframe.style.display = "";
    iframe.style.left = `${left}px`;
    iframe.style.top = `${top}px`;
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
  }

  // ---------- RAF loop ----------
  let rafId = 0;
  function frame(): void {
    if (idleSpinAllowed && !rotating) {
      cube.rotation.y += 0.0018;
      cube.rotation.x += 0.0006;
    }
    controls.update();
    syncIframeRect();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  // ---------- picking ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickFace(clientX: number, clientY: number): { faceId: number; u: number; v: number } | null {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(cube, false);
    if (hits.length === 0) return null;
    const hit = hits[0];
    const faceIdx = Math.floor((hit.faceIndex ?? 0) / 2);
    return { faceId: faceIdx, u: hit.uv?.x ?? 0.5, v: 1 - (hit.uv?.y ?? 0.5) };
  }

  function setLiveFace(faceId: number): void { currentLiveFace = faceId; }
  function setIframeVisible(visible: boolean): void {
    iframeVisibleRequested = visible;
    if (!visible) iframe.style.display = "none";
  }
  function setTargetUrl(url: string): void {
    if (iframe.src === url) return;
    iframe.src = url;
  }

  function dispose(): void {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    controls.dispose();
    materials.forEach((m) => m.dispose());
    geo.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    iframe.remove();
  }

  return {
    renderer,
    scene,
    camera,
    cube,
    controls,
    iframe,
    setIframeVisible,
    setLiveFace,
    setTargetUrl,
    setIdleSpin: (on: boolean) => { idleSpinAllowed = on; },
    pickFace,
    dispose
  };
}

const _tmpQuat = new THREE.Quaternion();

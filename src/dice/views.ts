/**
 * Camera viewpoints for the cube, as pure math so they can be unit-tested
 * without WebGL.
 *
 * The cube itself never rotates; OrbitControls moves the camera around it.
 * A "view" is therefore a camera position on a sphere around the origin.
 */

export type Vec3 = [number, number, number];

/** Outward normals in face-id order: +X, -X, +Y, -Y, +Z, -Z. */
export const FACE_NORMALS: ReadonlyArray<Vec3> = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1]
];

export interface Spherical {
  radius: number;
  /** Polar angle from +Y, radians (0 = straight above). */
  phi: number;
  /** Azimuth around +Y from +Z, radians. */
  theta: number;
}

const EPS = 1e-4;

export function toSpherical([x, y, z]: Vec3): Spherical {
  const radius = Math.hypot(x, y, z);
  if (radius === 0) return { radius: 0, phi: Math.PI / 2, theta: 0 };
  return {
    radius,
    phi: Math.acos(Math.min(1, Math.max(-1, y / radius))),
    theta: Math.atan2(x, z)
  };
}

export function fromSpherical({ radius, phi, theta }: Spherical): Vec3 {
  const s = Math.sin(phi);
  return [radius * s * Math.sin(theta), radius * Math.cos(phi), radius * s * Math.cos(theta)];
}

/** Keep the polar angle off the exact poles, where OrbitControls degenerates. */
export function clampPhi(phi: number): number {
  return Math.min(Math.PI - EPS * 10, Math.max(EPS * 10, phi));
}

/** Shortest signed angular distance from a to b, in (-PI, PI]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Interpolate two camera positions along the sphere (shortest azimuth). */
export function slerpPosition(from: Vec3, to: Vec3, t: number): Vec3 {
  const a = toSpherical(from);
  const b = toSpherical(to);
  return fromSpherical({
    radius: a.radius + (b.radius - a.radius) * t,
    phi: clampPhi(a.phi + (b.phi - a.phi) * t),
    theta: a.theta + angleDelta(a.theta, b.theta) * t
  });
}

/** Camera position looking straight at a face. */
export function frontOf(faceId: number, distance: number): Vec3 {
  const n = FACE_NORMALS[faceId] ?? FACE_NORMALS[4];
  // Top/bottom faces: nudge off the pole so the camera "up" stays stable.
  if (n[1] !== 0) {
    return fromSpherical({ radius: distance, phi: clampPhi(n[1] > 0 ? 0 : Math.PI), theta: 0 });
  }
  return [n[0] * distance, n[1] * distance, n[2] * distance];
}

/**
 * Three-quarter "overview" of a face: the face stays readable while two
 * neighbouring faces come into view, so the cube reads as a cube.
 */
export function overviewOf(faceId: number, distance: number): Vec3 {
  const base = toSpherical(frontOf(faceId, distance));
  const onPole = base.phi < 0.2 || base.phi > Math.PI - 0.2;
  return fromSpherical({
    radius: distance * 1.4,
    phi: onPole ? (base.phi < 0.2 ? 0.62 : Math.PI - 0.62) : Math.PI / 2 - 0.42,
    theta: base.theta + (onPole ? 0.7 : -0.62)
  });
}

/** Orbit a camera position by azimuth / polar steps (radians). */
export function orbit(pos: Vec3, dTheta: number, dPhi: number): Vec3 {
  const s = toSpherical(pos);
  return fromSpherical({ radius: s.radius, phi: clampPhi(s.phi + dPhi), theta: s.theta + dTheta });
}

/** Smooth, exponential-feeling ease-out. */
export function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

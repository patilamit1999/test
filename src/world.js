export const START = Object.freeze({ x: 0, z: 10.5 });
export const DARSHAN = Object.freeze({ x: 0, z: -2.4 });
export const PRASAD = Object.freeze({ x: 5.1, z: 1 });
export const OBSTACLES = [
  { x: 0, z: -7.1, width: 11, depth: 5.1 },
  { x: 7, z: 0, width: 2.6, depth: 3.2 },
  ...[-6, 6].flatMap(x => [-5, 1, 7].map(z => ({ x, z, width: 1.1, depth: 1.1 }))),
  ...[-3.9, 3.9].flatMap(x => [7.8, 10.3].map(z => ({ x, z, width: 1.2, depth: 1.2 }))),
];

export function canWalk(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 9 || z < -9 || z > 13) return false;
  return !OBSTACLES.some(o => Math.abs(x - o.x) < o.width / 2 + 0.32 && Math.abs(z - o.z) < o.depth / 2 + 0.32);
}

export function moveVisitor(position, dx, dz) {
  const next = { ...position };
  if (canWalk(next.x + dx, next.z)) next.x += dx;
  if (canWalk(next.x, next.z + dz)) next.z += dz;
  return next;
}

export function nearbyStation(position) {
  if (Math.hypot(position.x - DARSHAN.x, position.z - DARSHAN.z) < 2.6) return 'darshan';
  if (Math.hypot(position.x - PRASAD.x, position.z - PRASAD.z) < 2.1) return 'prasad';
  return null;
}

export function joystickVector(offsetX, offsetY, radius) {
  if (![offsetX, offsetY, radius].every(Number.isFinite) || radius <= 0) return { x: 0, z: 0 };
  const distance = Math.hypot(offsetX, offsetY);
  const strength = Math.min(distance / radius, 1);
  if (strength <= 0.12) return { x: 0, z: 0 };
  const speed = (strength - 0.12) / 0.88;
  return { x: offsetX / distance * speed, z: offsetY / distance * speed };
}

export function cleanName(name) {
  return String(name).trim().replace(/\s+/g, ' ').slice(0, 24);
}

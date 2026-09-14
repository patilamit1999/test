import * as THREE from 'three';
import { START, moveVisitor, nearbyStation } from './world.js';

const C = { gold: 0xc9953d, brass: 0xe2b655, marigold: 0xf2a62c, orange: 0xd85b24, cream: 0xf7e8c7, red: 0x97382d, rock: 0x596769, water: 0x5ac9d4, green: 0x567747, skin: 0xc9926b };
const materials = new Map();
const up = new THREE.Vector3(0, 1, 0);

function material(color, extra = {}) {
  const key = `${color}-${JSON.stringify(extra)}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  return materials.get(key);
}

function mesh(parent, geometry, color, position = [0, 0, 0], extra = {}) {
  const object = new THREE.Mesh(geometry, material(color, extra));
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(parent, size, color, position, extra) { return mesh(parent, new THREE.BoxGeometry(...size), color, position, extra); }
function sphere(parent, size, color, position, extra) {
  const object = mesh(parent, new THREE.SphereGeometry(1, 16, 12), color, position, extra);
  object.scale.set(...size);
  return object;
}
function cylinder(parent, top, bottom, height, color, position, segments = 20, extra) {
  return mesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments), color, position, extra);
}
function tube(parent, points, radius, color, extra) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 8, false), color, [0, 0, 0], extra);
}
function limb(parent, a, b, radius, color) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
  const object = cylinder(parent, radius * 0.8, radius, delta.length(), color, start.clone().add(end).multiplyScalar(0.5).toArray(), 12);
  object.quaternion.setFromUnitVectors(up, delta.normalize());
  return object;
}
function ring(parent, radius, thickness, color, position, rotation = [Math.PI / 2, 0, 0]) {
  const object = mesh(parent, new THREE.TorusGeometry(radius, thickness, 8, 48), color, position);
  object.rotation.set(...rotation);
  return object;
}
function group(parent, position = [0, 0, 0]) {
  const object = new THREE.Group();
  object.position.set(...position);
  parent.add(object);
  return object;
}

function label(parent, text, position, width = 2.5, bg = '#733a29', fg = '#ffe6b3') {
  const lines = Array.isArray(text) ? text : [text];
  const canvas = document.createElement('canvas');
  canvas.width = lines.length > 1 ? 1536 : 768;
  canvas.height = lines.length * 192;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  let disposed = false;
  texture.addEventListener('dispose', () => { disposed = true; });
  function draw() {
    if (disposed) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#c89d57';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
      const size = lines.length > 1 ? index === 0 ? 76 : 59 : 52;
      ctx.font = `500 ${size}px "Noto Sans Devanagari", "Kohinoor Devanagari", sans-serif`;
      ctx.fillText(line, canvas.width / 2, 102 + index * 180, canvas.width - 96);
    });
    texture.needsUpdate = true;
  }
  draw();
  document.fonts.load('500 52px "Noto Sans Devanagari"', lines.join(' ')).then(draw).catch(() => {});
  const object = new THREE.Mesh(new THREE.PlaneGeometry(width, width * canvas.height / canvas.width), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  object.position.set(...position);
  parent.add(object);
  return object;
}

function makePerson(parent, { x = 0, z = 0, gender = 'male', color, drummer = false, tasha = false, scale = 1 } = {}) {
  const person = group(parent, [x, 0.13, z]);
  person.scale.setScalar(scale);
  const outfit = color ?? (gender === 'female' ? 0xb55654 : gender === 'neutral' ? 0x6a8b7e : 0xd79a48);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = group(person, [side * 0.16, 0.73, 0]);
    cylinder(leg, 0.1, 0.08, 0.6, C.cream, [0, -0.3, 0], 12);
    sphere(leg, [0.12, 0.07, 0.2], 0x5a3828, [0, -0.61, 0.07]);
    legs.push(leg);
  }
  cylinder(person, 0.25, gender === 'female' ? 0.43 : 0.32, gender === 'female' ? 1.03 : 0.72, outfit, [0, gender === 'female' ? 0.79 : 1, 0], 12);
  if (gender === 'female') {
    const sash = box(person, [0.16, 0.85, 0.035], C.gold, [0.05, 0.94, 0.265]);
    sash.rotation.z = -0.35;
    sphere(person, [0.18, 0.26, 0.14], 0x322820, [0, 1.46, -0.18]);
  } else {
    box(person, [0.035, 0.42, 0.03], C.gold, [0, 1.1, 0.252]);
  }
  cylinder(person, 0.09, 0.1, 0.16, C.skin, [0, 1.43, 0]);
  sphere(person, [0.215, 0.27, 0.205], C.skin, [0, 1.66, 0]);
  sphere(person, [0.22, 0.135, 0.21], 0x352b24, [0, 1.84, -0.025]);
  for (const side of [-1, 1]) sphere(person, [0.018, 0.023, 0.012], 0x30251d, [side * 0.073, 1.69, 0.19]);
  sphere(person, [0.04, 0.05, 0.04], C.skin, [0, 1.62, 0.2]);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = group(person, [side * 0.28, 1.29, 0]);
    limb(arm, [0, 0, 0], [side * 0.08, -0.35, drummer ? 0.19 : 0.015], 0.095, outfit);
    limb(arm, [side * 0.08, -0.35, drummer ? 0.19 : 0.015], [side * 0.08, drummer ? -0.3 : -0.57, drummer ? 0.48 : 0.045], 0.065, C.skin);
    if (drummer) limb(arm, [side * 0.08, -0.3, 0.48], [side * -0.05, -0.51, 0.67], 0.018, 0xe4bf78);
    arms.push(arm);
  }
  if (drummer) {
    sphere(person, [0.255, 0.14, 0.235], C.orange, [0, 1.9, 0]);
    const tail = box(person, [0.12, 0.52, 0.025], C.orange, [0.19, 1.82, -0.12]);
    tail.rotation.z = -0.3;
    const drum = group(person, [0, 0.91, 0.48]);
    if (!tasha) drum.rotation.z = Math.PI / 2;
    cylinder(drum, 0.3, 0.3, tasha ? 0.18 : 0.67, C.red, [0, 0, 0]);
    for (const side of [-1, 1]) {
      cylinder(drum, 0.31, 0.31, 0.035, C.cream, [0, side * (tasha ? 0.1 : 0.34), 0]);
      ring(drum, 0.3, 0.025, C.gold, [0, side * (tasha ? 0.1 : 0.34), 0]);
    }
    for (let i = 0; i < 10; i++) {
      const angle = i / 10 * Math.PI * 2;
      limb(drum, [Math.cos(angle) * 0.3, -0.3, Math.sin(angle) * 0.3], [Math.cos(angle + 0.3) * 0.3, 0.3, Math.sin(angle + 0.3) * 0.3], 0.009, C.cream);
    }
    tube(person, [[-0.2, 1.35, 0.12], [0, 1.13, 0.34], [0.27, 0.9, 0.4]], 0.025, C.gold);
  }
  person.userData = { arms, legs };
  return person;
}

function makeGanpati(parent) {
  const idol = group(parent, [0, 3.05, -6.6]);
  cylinder(idol, 1.26, 1.45, 0.2, C.gold, [0, 0.05, 0], 48);
  cylinder(idol, 1.17, 1.25, 0.16, C.red, [0, 0.21, 0], 40);
  for (let i = 0; i < 14; i++) {
    const angle = i / 14 * Math.PI * 2;
    const petal = sphere(idol, [0.24, 0.09, 0.48], 0xcf7473, [Math.cos(angle) * 1.08, 0.26, Math.sin(angle) * 1.08]);
    petal.rotation.y = -angle + Math.PI / 2;
  }
  const skin = 0xe8ad82;
  sphere(idol, [0.73, 0.78, 0.53], skin, [0, 1.12, 0]);
  sphere(idol, [0.82, 0.28, 0.54], C.orange, [-0.43, 0.52, 0.15]);
  sphere(idol, [0.82, 0.28, 0.54], C.orange, [0.43, 0.52, 0.15]);
  sphere(idol, [0.3, 0.16, 0.3], skin, [-0.66, 0.43, 0.55]);
  sphere(idol, [0.3, 0.16, 0.3], skin, [0.66, 0.43, 0.55]);
  for (const side of [-1, 1]) {
    limb(idol, [side * 0.5, 1.5, -0.04], [side * 1.01, 1.81, -0.03], 0.16, skin);
    limb(idol, [side * 1.01, 1.81, -0.03], [side * 1.05, 2.2, 0.05], 0.13, skin);
    sphere(idol, [0.16, 0.2, 0.12], skin, [side * 1.05, 2.23, 0.05]);
    ring(idol, 0.13, 0.045, C.gold, [side * 1.05, 2.09, 0.04]);
    limb(idol, [side * 0.58, 1.42, 0.08], [side * 0.97, 1.14, 0.29], 0.18, skin);
    limb(idol, [side * 0.97, 1.14, 0.29], [side * 0.94, side === 1 ? 1.66 : 1.07, 0.55], 0.13, skin);
    sphere(idol, [0.17, 0.22, 0.1], skin, [side * 0.94, side === 1 ? 1.75 : 1.12, 0.55]);
    ring(idol, 0.135, 0.04, C.gold, [side * 0.94, side === 1 ? 1.52 : 1.05, 0.49]);
  }
  sphere(idol, [0.64, 0.71, 0.47], skin, [0, 2.1, 0.02]);
  for (const side of [-1, 1]) {
    const ear = sphere(idol, [0.47, 0.57, 0.15], skin, [side * 0.65, 2.12, 0.025]);
    ear.rotation.z = side * -0.22;
    const inner = sphere(idol, [0.32, 0.4, 0.04], 0xce876e, [side * 0.72, 2.12, 0.172]);
    inner.rotation.z = side * -0.22;
    sphere(idol, [0.094, 0.045, 0.018], 0x463025, [side * 0.245, 2.23, 0.446]);
    tube(idol, [[side * 0.36, 2.35, 0.42], [side * 0.25, 2.39, 0.46], [side * 0.16, 2.36, 0.46]], 0.018, 0x663d2b);
    const tusk = mesh(idol, new THREE.ConeGeometry(0.075, side === 1 ? 0.34 : 0.22, 12), 0xfff4ce, [side * 0.28, 1.91, 0.48]);
    tusk.rotation.z = side * 0.25 + Math.PI;
    ring(idol, 0.095, 0.026, C.gold, [side * 0.8, 1.72, 0.15], [0, 0, 0]);
  }
  tube(idol, [[0, 2.09, 0.44], [0, 1.88, 0.66], [0.02, 1.57, 0.75], [-0.07, 1.31, 0.79], [-0.31, 1.29, 0.8], [-0.42, 1.48, 0.79]], 0.15, skin);
  box(idol, [0.045, 0.17, 0.025], C.red, [0, 2.48, 0.442]);
  sphere(idol, [0.035, 0.035, 0.02], C.red, [0, 2.34, 0.48]);
  cylinder(idol, 0.47, 0.59, 0.18, C.gold, [0, 2.7, 0]);
  cylinder(idol, 0.17, 0.46, 0.56, C.gold, [0, 3.05, 0]);
  for (const y of [2.75, 2.88, 3.04, 3.2]) ring(idol, 0.46 - (y - 2.75) * 0.56, 0.035, 0xf2d47b, [0, y, 0]);
  sphere(idol, [0.1, 0.16, 0.1], C.gold, [0, 3.44, 0]);
  sphere(idol, [0.072, 0.1, 0.035], C.red, [0, 2.9, 0.405]);
  tube(idol, [[-0.41, 1.75, 0.4], [-0.37, 1.32, 0.56], [0, 0.95, 0.57], [0.37, 1.32, 0.56], [0.41, 1.75, 0.4]], 0.065, C.gold);
  for (let i = 0; i < 17; i++) {
    const t = i / 16;
    sphere(idol, [0.085, 0.085, 0.07], i % 3 ? C.marigold : C.red, [Math.cos(Math.PI * t) * 0.47, 1.65 - Math.sin(Math.PI * t) * 0.82, 0.62]);
  }
  cylinder(idol, 0.25, 0.15, 0.055, C.gold, [-0.96, 1.27, 0.6]);
  mesh(idol, new THREE.ConeGeometry(0.105, 0.18, 12), C.cream, [-0.96, 1.37, 0.6]);
  limb(idol, [-1.05, 2.2, 0.05], [-1.05, 2.66, 0.05], 0.025, C.gold);
  sphere(idol, [0.15, 0.2, 0.06], 0xd18174, [-1.05, 2.7, 0.05]);
  ring(idol, 1.92, 0.04, C.gold, [0, 1.87, -0.65], [0, 0, 0]);
  for (let i = 0; i < 32; i++) {
    const angle = i / 32 * Math.PI * 2;
    sphere(idol, [0.047, 0.047, 0.04], C.gold, [Math.sin(angle) * 2.04, 1.87 + Math.cos(angle) * 2.04, -0.65], { emissive: 0xb67c26, emissiveIntensity: 0.4 });
  }
  return idol;
}

export function createScene(canvas, onLocation, onMovementReset = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9dfca);
  scene.fog = new THREE.Fog(0xe9dfca, 35, 75);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  const ambient = new THREE.HemisphereLight(0xfff4df, 0x9b8b6c, 2.4);
  scene.add(ambient);
  const sunlight = new THREE.DirectionalLight(0xffecd1, 3.5);
  sunlight.position.set(-7, 20, 12);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
  sunlight.shadow.normalBias = 0.04;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight(0xc1e4ed, 1.2);
  fill.position.set(8, 10, -10);
  scene.add(fill);
  const shrineLight = new THREE.PointLight(0xffb653, 25, 14, 2);
  shrineLight.position.set(0, 6, -4);
  scene.add(shrineLight);
  const root = group(scene);
  box(root, [200, 0.2, 200], 0xe3d8bf, [0, -0.5, 0]);
  box(root, [21.4, 0.5, 25.2], 0xc3aa81, [0, -0.2, 0.2]);
  box(root, [20.8, 0.18, 24.6], 0xf1e5cb, [0, 0.05, 0.2]);
  for (let x = -10; x <= 10; x += 2) {
    for (let z = -11; z <= 11; z += 2) {
      box(root, [1.975, 0.018, 1.975], (x + z) % 4 === 1 ? 0xeaddc3 : 0xe0d0b1, [x, 0.15, z]);
    }
  }
  box(root, [3.6, 0.025, 18.5], 0xa34b37, [0, 0.18, 3.2]);
  for (const side of [-1, 1]) {
    box(root, [0.055, 0.027, 18.5], C.gold, [side * 1.67, 0.197, 3.2]);
    box(root, [0.026, 0.027, 18.5], 0xdfb677, [side * 1.54, 0.197, 3.2]);
  }
  for (let z = -4; z < 12; z += 2) {
    const detail = box(root, [0.27, 0.03, 0.27], 0xcc8e59, [0, 0.205, z]);
    detail.rotation.y = Math.PI / 4;
  }
  box(root, [18, 0.25, 1.3], C.cream, [0, -0.02, 13]);
  box(root, [19, 0.2, 1.3], 0xd8c6a4, [0, -0.23, 14]);
  const flames = [];
  function diya(x, y, z, size = 1) {
    const holder = group(root, [x, y, z]);
    holder.scale.setScalar(size);
    cylinder(holder, 0.17, 0.1, 0.09, 0xb97d38, [0, 0, 0], 16, { metalness: 0.5 });
    const flame = sphere(holder, [0.043, 0.12, 0.043], 0xffe1a0, [0, 0.13, 0], { emissive: 0xffb52d, emissiveIntensity: 2 });
    flames.push(flame);
  }
  for (const x of [-2.13, 2.13]) for (let z = -3; z < 12; z += 2.4) diya(x, 0.26, z, 0.9);
  function garland(a, b, sag = 0.3) {
    const count = Math.ceil(new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)) * 7);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      sphere(root, [0.095, 0.105, 0.095], i % 8 < 2 ? C.red : C.marigold, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t]);
    }
  }
  for (const x of [-6, 6]) {
    for (const z of [-5, 1, 7]) {
      box(root, [0.93, 0.25, 0.93], C.red, [x, 0.27, z]);
      box(root, [0.75, 0.18, 0.75], C.gold, [x, 0.47, z]);
      cylinder(root, 0.23, 0.3, 5.2, 0xf3dfb4, [x, 3.07, z]);
      for (const y of [0.65, 1.08, 4.96, 5.45]) cylinder(root, 0.33, 0.33, 0.13, C.gold, [x, y, z]);
      box(root, [0.76, 0.23, 0.76], C.red, [x, 5.65, z]);
      for (let j = 0; j < 19; j++) {
        const angle = j * 0.59;
        sphere(root, [0.105, 0.13, 0.105], j % 4 ? C.marigold : C.cream, [x + Math.cos(angle) * 0.31, 1.25 + j * 0.19, z + Math.sin(angle) * 0.31]);
      }
    }
    box(root, [0.43, 0.35, 13.2], C.red, [x, 5.84, 1]);
    box(root, [0.47, 0.07, 13.3], C.gold, [x, 6.04, 1]);
    garland([x, 5.6, -5], [x, 5.6, 1], 0.7);
    garland([x, 5.6, 1], [x, 5.6, 7], 0.7);
  }
  for (const z of [7]) {
    box(root, [12.8, 0.42, 0.55], C.red, [0, 5.87, z]);
    box(root, [12.9, 0.075, 0.6], C.gold, [0, 6.12, z]);
    for (let x = -6; x < 6; x += 3) garland([x, 5.68, z], [x + 3, 5.68, z], 0.5);
  }
  label(root, 'श्री गणेशाय नमः', [0, 5.97, 7.3], 3.3);
  const greeting = document.getElementById('entry-greeting');
  box(root, [9.85, 2.65, 0.14], C.gold, [0, 7.5, 7.28]);
  box(root, [9.7, 2.5, 0.16], C.red, [0, 7.5, 7.32]);
  const banner = label(root, [greeting.querySelector('strong').textContent, greeting.querySelector('p').textContent], [0, 7.5, 7.43], 9.6, '#8a3427', '#fff0c7');
  banner.name = 'entry-greeting-banner';
  for (const x of [-4.75, 4.75]) cylinder(root, 0.045, 0.045, 2.8, C.gold, [x, 7.54, 7.2]);
  garland([-4.7, 8.88, 7.48], [0, 8.88, 7.48], 0.13);
  garland([0, 8.88, 7.48], [4.7, 8.88, 7.48], 0.13);
  for (const x of [-4.8, -2.7, 2.7, 4.8]) {
    cylinder(root, 0.015, 0.015, 0.48, C.gold, [x, 5.39, 7]);
    cylinder(root, 0.09, 0.22, 0.28, C.gold, [x, 5.04, 7]);
    sphere(root, [0.035, 0.07, 0.035], C.gold, [x, 4.85, 7]);
  }
  for (const x of [-5, -2.5, 2.5, 5]) {
    tube(root, [[x, 6.1, -5], [x, 6.8, 1], [x, 6.1, 7]], 0.015, 0x907854);
    for (let j = 0; j <= 16; j++) {
      const t = j / 16;
      sphere(root, [0.042, 0.06, 0.042], 0xffe8b1, [x, 6.1 + Math.sin(t * Math.PI) * 0.7, -5 + 12 * t], { emissive: 0xffc55a, emissiveIntensity: 1.5 });
    }
  }
  box(root, [12.5, 0.35, 6], 0xc8ae80, [0, 0.31, -7.25]);
  box(root, [11.9, 0.24, 5.6], C.cream, [0, 0.6, -7.25]);
  box(root, [4.8, 0.22, 0.7], C.cream, [0, 0.3, -3.9]);
  box(root, [4.4, 0.22, 0.7], C.gold, [0, 0.52, -4.25]);
  const rock = mesh(root, new THREE.ConeGeometry(1, 1, 9, 2), C.rock, [0, 2, -7]);
  rock.scale.set(4.6, 2.6, 2.4);
  rock.rotation.z = Math.PI;
  rock.rotation.y = 0.2;
  const island = mesh(root, new THREE.DodecahedronGeometry(1, 1), C.rock, [0, 2.75, -7]);
  island.scale.set(4.75, 0.67, 2.65);
  for (const [x, y, z, sx, sy, sz] of [[-2.6, 4.3, -8.3, 1.2, 1.7, 1], [-1.2, 5.1, -8.8, 1.4, 2.6, 1], [0.5, 5.5, -8.85, 1.4, 3.3, 1], [2.1, 4.5, -8.6, 1.3, 2.1, 1]]) {
    const peak = mesh(root, new THREE.DodecahedronGeometry(1, 0), x < 0 ? 0x627173 : 0x526364, [x, y, z]);
    peak.scale.set(sx, sy, sz);
    peak.rotation.y = x;
    const moss = mesh(root, new THREE.DodecahedronGeometry(1, 0), 0x78806a, [x + 0.15, y - 0.3, z + 0.2]);
    moss.scale.set(sx * 1.02, sy * 0.36, sz * 1.02);
  }
  for (const x of [-4.05, 4.05]) {
    cylinder(root, 0.14, 0.18, 2.25, C.cream, [x, 1.8, -6.5]);
    for (let i = 0; i < 15; i++) {
      const a = i * 0.8;
      sphere(root, [0.1, 0.1, 0.1], i % 3 ? 0xfff1ba : C.green, [x + Math.cos(a) * 0.2, 0.8 + i * 0.14, -6.5 + Math.sin(a) * 0.2], i % 3 ? { emissive: 0xffd479, emissiveIntensity: 0.5 } : {});
    }
  }
  const water = [];
  for (const x of [-3.15, -2.91, 3.22]) {
    const stream = box(root, [x > 0 ? 0.23 : 0.09, 2.7, 0.035], C.water, [x, 1.92, -5.28], { transparent: true, opacity: 0.5, metalness: 0.25, roughness: 0.15, emissive: 0x368c9b, emissiveIntensity: 0.25 });
    water.push(stream);
    for (let i = 0; i < 8; i++) {
      const drop = sphere(root, [0.025, 0.09, 0.025], 0xc2f7ec, [x, 0.7 + i * 0.34, -5.25], { transparent: true, opacity: 0.6 });
      drop.userData.phase = i / 8;
      water.push(drop);
    }
  }
  const pool = sphere(root, [3.3, 0.035, 1.6], 0x77b9b4, [0, 0.76, -6.7], { metalness: 0.3, roughness: 0.17 });
  for (let i = 0; i < 20; i++) {
    const angle = i / 20 * Math.PI * 2;
    const stone = mesh(root, new THREE.DodecahedronGeometry(0.2, 0), 0x949788, [Math.cos(angle) * 3.4, 0.8, -6.7 + Math.sin(angle) * 1.65]);
    stone.scale.set(1.3, 0.6, 1);
  }
  makeGanpati(root);
  function plant(x, z, size = 1) {
    const plantGroup = group(root, [x, 0.17, z]);
    plantGroup.scale.setScalar(size);
    cylinder(plantGroup, 0.35, 0.24, 0.5, 0xb78056, [0, 0.25, 0]);
    cylinder(plantGroup, 0.38, 0.38, 0.08, C.gold, [0, 0.47, 0]);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const end = [Math.cos(a) * 0.7, 1.15 + (i % 3) * 0.3, Math.sin(a) * 0.7];
      limb(plantGroup, [0, 0.4, 0], end, 0.025, 0x55713b);
      const leaf = sphere(plantGroup, [0.15, 0.56, 0.035], i % 2 ? 0x66834e : 0x3c6944, end);
      leaf.rotation.set(Math.sin(a) * 0.7, a, Math.cos(a) * -0.7);
    }
  }
  for (const x of [-8.4, 8.4]) for (const z of [-7, 4.5, 10.5]) plant(x, z, z < 0 ? 1.4 : 1.1);
  for (const x of [-4.5, 4.5]) {
    const tree = group(root, [x, 3.03, -7.3]);
    limb(tree, [0, 0, 0], [0.12, 1.5, 0], 0.07, 0x70583b);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      const end = [Math.cos(a) * 0.5, 0.85 + (i % 3) * 0.35, Math.sin(a) * 0.4];
      limb(tree, [0.08, 0.55, 0], end, 0.035, 0x70583b);
      const crown = mesh(tree, new THREE.IcosahedronGeometry(0.5, 1), i % 2 ? 0x4e784c : 0x648353, end);
      crown.scale.y = 0.6;
    }
  }
  for (const x of [-4.4, 4.4]) {
    cylinder(root, 0.28, 0.42, 0.15, C.gold, [x, 0.27, -3.9]);
    cylinder(root, 0.075, 0.12, 1.5, C.gold, [x, 1.05, -3.9]);
    cylinder(root, 0.5, 0.3, 0.1, C.gold, [x, 1.8, -3.9]);
    for (let i = 0; i < 6; i++) diya(x + Math.cos(i * Math.PI / 3) * 0.36, 1.89, -3.9 + Math.sin(i * Math.PI / 3) * 0.36, 0.75);
  }
  const counter = group(root, [7, 0.2, 0]);
  box(counter, [2.2, 1.08, 2.8], 0xb7683a, [0, 0.54, 0]);
  box(counter, [2.45, 0.12, 3], 0xf3d89d, [0, 1.14, 0]);
  box(counter, [2.22, 0.7, 2.82], 0xb6452a, [0, 0.75, 0]);
  for (const z of [-1.25, 1.25]) {
    cylinder(counter, 0.045, 0.045, 3.15, C.gold, [1, 1.58, z]);
    cylinder(counter, 0.045, 0.045, 3.15, C.gold, [-1, 1.58, z]);
  }
  box(counter, [2.65, 0.16, 3.3], C.red, [0, 3.2, 0]);
  for (let z = -1.4; z < 1.5; z += 0.32) box(counter, [2.65, 0.025, 0.14], 0xd99a55, [0, 3.295, z]);
  label(counter, 'प्रसाद कक्ष', [0, 2.8, 1.28], 2);
  const sideLabel = label(counter, 'प्रसाद कक्ष', [-1.02, 0.73, 0], 1.8);
  sideLabel.rotation.y = -Math.PI / 2;
  for (const z of [-0.65, 0.65]) {
    cylinder(counter, 0.47, 0.4, 0.06, C.gold, [-0.25, 1.24, z]);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      mesh(counter, new THREE.ConeGeometry(0.105, 0.16, 10), C.cream, [-0.25 + Math.cos(a) * 0.27, 1.35, z + Math.sin(a) * 0.27]);
    }
  }
  const attendant = makePerson(root, { x: 8.25, z: 0, color: 0xf5dfb3 });
  attendant.rotation.y = -Math.PI / 2;
  const drummers = [];
  for (const x of [-3.9, 3.9]) {
    for (const [i, z] of [7.8, 10.3].entries()) {
      const person = makePerson(root, { x, z, drummer: true, tasha: i === 1, color: 0xf4e5c9 });
      person.rotation.y = x < 0 ? 0.5 : -0.5;
      drummers.push(person);
    }
  }
  for (const [x, z, gender, color, rotation] of [[-4, -1, 'female', 0xa75b6e, 0.1], [3.7, -2, 'male', 0x809183, -0.3], [-7.7, 1.4, 'male', 0xc09457, 0.6], [3.6, 3.5, 'female', 0xbe7941, -0.8]]) {
    const person = makePerson(root, { x, z, gender, color, scale: 0.95 });
    person.rotation.y = Math.PI + rotation;
  }
  const rangoli = group(root, [0, 0.212, 10.9]);
  ring(rangoli, 1.15, 0.025, C.gold, [0, 0, 0]);
  ring(rangoli, 0.5, 0.025, C.cream, [0, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const petal = sphere(rangoli, [0.11, 0.012, 0.33], i % 2 ? C.marigold : C.cream, [Math.sin(a) * 0.79, 0, Math.cos(a) * 0.79]);
    petal.rotation.y = a;
  }
  const particlesGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(150 * 3);
  for (let i = 0; i < 150; i++) {
    particlePositions[i * 3] = Math.sin(i * 127.1) * 10;
    particlePositions[i * 3 + 1] = ((i * 1.73) % 7) + 0.5;
    particlePositions[i * 3 + 2] = Math.cos(i * 63.7) * 12;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({ color: 0xffe0a0, size: 0.045, transparent: true, opacity: 0.65, depthWrite: false }));
  root.add(particles);
  let avatar = null, playing = false, angle = 0.25, pitch = 0, overview = false, dragging = false, pointerX = 0, pointerY = 0;
  let position = { ...START }, station = null, lastTime = performance.now(), frame = 0, disposed = false;
  const keys = new Set();
  const touchMovement = { x: 0, z: 0 };
  const target = new THREE.Vector3(0, 2, -1);
  const desiredCamera = new THREE.Vector3();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const offeredFlowers = group(root);
  const petals = [];
  const remoteVisitors = new Map();
  const resize = new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 600 && height > 550 ? 52 : playing ? 48 : 39;
    camera.updateProjectionMatrix();
  });
  resize.observe(canvas);
  function updateStation() {
    const next = nearbyStation(position);
    if (next !== station) { station = next; onLocation(station); }
  }
  function releaseKeys() {
    keys.clear();
    touchMovement.x = 0;
    touchMovement.z = 0;
    dragging = false;
    pitch = 0;
    onMovementReset();
  }
  const movementKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
  function keydown(event) {
    if (!playing || document.querySelector('dialog[open]') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const key = event.key.toLowerCase();
    if (movementKeys.includes(key)) { event.preventDefault(); keys.add(key); }
  }
  function keyup(event) { keys.delete(event.key.toLowerCase()); }
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', releaseKeys);
  document.addEventListener('visibilitychange', releaseKeys);
  canvas.addEventListener('pointerdown', event => { dragging = true; pointerX = event.clientX; pointerY = event.clientY; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    angle -= (event.clientX - pointerX) * 0.006;
    pitch = Math.max(-0.6, Math.min(0.6, pitch + (event.clientY - pointerY) * 0.004));
    pointerX = event.clientX;
    pointerY = event.clientY;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  function disposeAvatar() {
    if (!avatar) return;
    root.remove(avatar);
    avatar.traverse(object => {
      if (object.isMesh) {
        object.geometry.dispose();
        if (object.material.map) { object.material.map.dispose(); object.material.dispose(); }
      }
    });
    avatar = null;
  }
  function enter(name, gender) {
    disposeAvatar();
    avatar = makePerson(root, { gender });
    label(avatar, name, [0, 2.28, 0], Math.max(1.1, name.length * 0.065), '#fff7e8', '#764b29');
    playing = true;
    overview = false;
    position = { ...START };
    avatar.position.set(position.x, 0.2, position.z);
    avatar.rotation.y = Math.PI;
    angle = 0;
    station = undefined;
    updateStation();
    canvas.focus({ preventScroll: true });
  }
  function teleport(destination) {
    position = { ...destination };
    avatar.position.set(position.x, 0.2, position.z);
    avatar.rotation.y = Math.PI;
    angle = 0;
    overview = false;
    releaseKeys();
    updateStation();
  }
  function offerFlowers() {
    if (offeredFlowers.children.length) return;
    for (let i = 0; i < 25; i++) {
      const a = i * 2.4, r = 0.5 + (i % 5) * 0.24;
      sphere(offeredFlowers, [0.11, 0.055, 0.1], i % 3 ? C.marigold : 0xcf6261, [Math.cos(a) * r, 3.25, -5.65 + Math.sin(a) * 0.42]);
      const petal = sphere(root, [0.065, 0.025, 0.1], i % 3 ? C.marigold : 0xe48986, [Math.sin(a) * 1.5, 6 + (i % 5) * 0.35, -5.5 + Math.cos(a)]);
      petals.push(petal);
    }
  }
  function addRemoteVisitor(id, info) {
    if (remoteVisitors.has(id)) return;
    const person = makePerson(root, { x: info.x ?? 0, z: info.z ?? 10.5, gender: info.gender || 'male' });
    const name = info.name || 'भावक';
    label(person, name, [0, 2.28, 0], Math.max(1.1, name.length * 0.065), '#fff7e8', '#764b29');
    person.position.set(info.x ?? 0, 0.2, info.z ?? 10.5);
    person.rotation.y = info.angle ?? 0.25;
    person.userData.targetX = info.x ?? 0;
    person.userData.targetZ = info.z ?? 10.5;
    person.userData.targetAngle = info.angle ?? 0.25;
    remoteVisitors.set(id, person);
  }
  function updateRemoteVisitor(id, info) {
    const person = remoteVisitors.get(id);
    if (!person) { addRemoteVisitor(id, info); return; }
    if (info.x !== undefined) person.userData.targetX = info.x;
    if (info.z !== undefined) person.userData.targetZ = info.z;
    if (info.angle !== undefined) person.userData.targetAngle = info.angle;
  }
  function removeRemoteVisitor(id) {
    const person = remoteVisitors.get(id);
    if (!person) return;
    root.remove(person);
    person.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material?.map) { obj.material.map.dispose(); obj.material.dispose(); } });
    remoteVisitors.delete(id);
  }
  function clearRemoteVisitors() {
    for (const id of [...remoteVisitors.keys()]) removeRemoteVisitor(id);
  }
  function tick(now) {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const time = now / 1000;
    if (playing) {
      let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')) + touchMovement.x;
      let dz = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) + touchMovement.z;
      const speed = Math.min(1, Math.hypot(dx, dz));
      const moving = speed > 0;
      if (moving) {
        const length = Math.max(1, Math.hypot(dx, dz));
        dx /= length; dz /= length;
        const worldX = dx * Math.cos(angle) + dz * Math.sin(angle);
        const worldZ = -dx * Math.sin(angle) + dz * Math.cos(angle);
        position = moveVisitor(position, worldX * dt * 3.5, worldZ * dt * 3.5);
        avatar.position.set(position.x, 0.2 + (reducedMotion ? 0 : Math.abs(Math.sin(time * 9)) * 0.035), position.z);
        avatar.rotation.y = Math.atan2(worldX, worldZ);
        updateStation();
      }
      avatar.userData.legs.forEach((leg, i) => { leg.rotation.x = moving && !reducedMotion ? Math.sin(time * 9 + i * Math.PI) * 0.42 * speed : 0; });
      avatar.userData.arms.forEach((arm, i) => { arm.rotation.x = moving && !reducedMotion ? Math.sin(time * 9 + i * Math.PI + Math.PI) * 0.25 * speed : 0; });
      avatar.children[avatar.children.length - 1].quaternion.copy(camera.quaternion).premultiply(avatar.quaternion.clone().invert());
      if (overview) {
        target.lerp(new THREE.Vector3(0, 1.8, -1), 1 - Math.exp(-dt * 4));
        desiredCamera.set(Math.sin(angle) * 23, 19, Math.cos(angle) * 23);
      } else if (station === 'darshan') {
        target.lerp(new THREE.Vector3(position.x * 0.5, 3.1, -4.7), 1 - Math.exp(-dt * 5));
        desiredCamera.set(position.x + Math.sin(angle) * 9, 6.5, Math.min(position.z + Math.cos(angle) * 9, 6.2));
      } else if (position.z > 7) {
        target.lerp(new THREE.Vector3(position.x, 3.6, 4.8), 1 - Math.exp(-dt * 5));
        desiredCamera.set(position.x + Math.sin(angle) * 10, 7.5, position.z + Math.cos(angle) * 10);
      } else {
        target.lerp(new THREE.Vector3(position.x, 2.5, position.z - 3), 1 - Math.exp(-dt * 5));
        desiredCamera.set(position.x + Math.sin(angle) * 8, 6.2, position.z + Math.cos(angle) * 8);
      }
    } else {
      target.set(0, 2.2, -1.2);
      const narrow = canvas.clientWidth < 760;
      const orbit = angle + (reducedMotion ? 0 : Math.sin(time * 0.08) * 0.025);
      desiredCamera.set(Math.sin(orbit) * (narrow ? 31 : 34), overview ? 25 : 18, Math.cos(orbit) * (narrow ? 31 : 34));
    }
    if (camera.position.length() === 0) camera.position.copy(desiredCamera);
    camera.position.lerp(desiredCamera, reducedMotion ? 1 : 1 - Math.exp(-dt * 3));
    const lookTarget = target.clone();
    if (playing && pitch !== 0) {
      const offset = new THREE.Vector3().subVectors(camera.position, target);
      const right = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize();
      lookTarget.addScaledVector(right, 0).add(new THREE.Vector3(0, pitch * offset.length() * 0.5, 0));
    }
    camera.lookAt(lookTarget);
    for (const [id, person] of remoteVisitors) {
      person.position.x += (person.userData.targetX - person.position.x) * Math.min(1, dt * 8);
      person.position.z += (person.userData.targetZ - person.position.z) * Math.min(1, dt * 8);
      const da = person.userData.targetAngle - person.rotation.y;
      person.rotation.y += Math.atan2(Math.sin(da), Math.cos(da)) * Math.min(1, dt * 8);
      const moving = Math.abs(person.userData.targetX - person.position.x) + Math.abs(person.userData.targetZ - person.position.z) > 0.05;
      person.userData.legs?.forEach((leg, i) => { leg.rotation.x = moving && !reducedMotion ? Math.sin(time * 9 + i * Math.PI) * 0.42 : 0; });
      person.userData.arms?.forEach((arm, i) => { arm.rotation.x = moving && !reducedMotion ? Math.sin(time * 9 + i * Math.PI + Math.PI) * 0.25 : 0; });
      const lbl = person.children[person.children.length - 1];
      if (lbl?.quaternion) lbl.quaternion.copy(camera.quaternion);
    }
    if (!reducedMotion) {
      drummers.forEach((person, i) => person.userData.arms.forEach((arm, j) => { arm.rotation.x = Math.sin(time * 10 + i + j * Math.PI) * 0.2; }));
      flames.forEach((flame, i) => { flame.scale.y = 0.12 * (0.9 + Math.sin(time * 7 + i) * 0.13); });
      water.forEach((object, i) => {
        if (object.userData.phase !== undefined) object.position.y = 3.25 - ((time * 0.65 + object.userData.phase) % 1) * 2.55;
        else object.material.opacity = 0.46 + Math.sin(time * 2 + i) * 0.09;
      });
      particles.rotation.y = time * 0.012;
    }
    for (let i = petals.length - 1; i >= 0; i--) {
      const petal = petals[i];
      petal.position.y -= dt * 0.8;
      petal.rotation.x += dt;
      if (petal.position.y < 3.25) { root.remove(petal); petal.geometry.dispose(); petals.splice(i, 1); }
    }
    pool.scale.y = 0.035;
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(tick);
  return {
    enter,
    leave() { playing = false; releaseKeys(); disposeAvatar(); clearRemoteVisitors(); angle = 0.25; },
    teleport,
    offerFlowers,
    toggleView() { overview = !overview; },
    setJoystickInput(x, z) {
      touchMovement.x = Number.isFinite(x) ? x : 0;
      touchMovement.z = Number.isFinite(z) ? z : 0;
    },
    pause: releaseKeys,
    getPosition: () => ({ ...position }),
    getAngle: () => angle,
    addRemoteVisitor,
    updateRemoteVisitor,
    removeRemoteVisitor,
    clearRemoteVisitors,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', releaseKeys);
      document.removeEventListener('visibilitychange', releaseKeys);
      clearRemoteVisitors();
      scene.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material?.map) object.material.map.dispose(); });
      materials.forEach(value => value.dispose());
      materials.clear();
      renderer.dispose();
    },
  };
}

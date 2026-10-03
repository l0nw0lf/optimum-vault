import * as THREE from "three";
import { H, SIGNALS, T, type SignalId } from "@/game/layout";

export type SignalBuilt = {
  id: SignalId;
  root: THREE.Group;
  glows: THREE.MeshStandardMaterial[];
  light: THREE.PointLight;
};

export type WorldBuilt = {
  apartment: THREE.Scene;
  gate: THREE.Scene;
  signals: SignalBuilt[];
  doorL: THREE.Group;
  doorR: THREE.Group;
  dust: THREE.Points;
  gateDust: THREE.Points;
};

const UNIT = new THREE.BoxGeometry(1, 1, 1);

type MatName = "wall" | "floor" | "ceil" | "trim" | "cloth" | "metal" | "glass" | "dark" | "glow";

function mats(): Record<MatName, THREE.MeshStandardMaterial> {
  return {
    wall: new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.94, metalness: 0.04 }),
    floor: new THREE.MeshStandardMaterial({
      color: 0x0e1013,
      roughness: 0.38,
      metalness: 0.62,
      map: floorTexture(),
    }),
    ceil: new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.9, metalness: 0.02 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.55, metalness: 0.35 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.92, metalness: 0 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3a424a, roughness: 0.32, metalness: 0.82 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x9aafc4,
      roughness: 0.06,
      metalness: 0.15,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.8, metalness: 0.1 }),
    glow: new THREE.MeshStandardMaterial({
      color: 0x0c1016,
      emissive: 0xb7c9e6,
      emissiveIntensity: 1.35,
      roughness: 0.4,
      metalness: 0.1,
    }),
  };
}

function floorTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d");
  if (!g) return new THREE.CanvasTexture(c);
  g.fillStyle = "#0c0e11";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(183,201,230,0.07)";
  g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    g.beginPath();
    g.moveTo(i * 64, 0);
    g.lineTo(i * 64, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * 64);
    g.lineTo(512, i * 64);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function cityTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  if (!g) return tex;
  g.fillStyle = "#06070a";
  g.fillRect(0, 0, 512, 768);
  for (let y = 28; y < 740; y += 16) {
    for (let x = 12; x < 500; x += 20) {
      if (((x * 13 + y * 7) % 10) > 5) continue;
      const a = 0.18 + ((x * y) % 7) / 14;
      g.fillStyle = `rgba(190, 208, 228, ${a})`;
      g.fillRect(x, y, 7, 10);
    }
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addBox(
  scene: THREE.Scene,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(UNIT, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  scene.add(mesh);
  return mesh;
}

function dust(count: number, spread: THREE.Vector3, center: THREE.Vector3, size: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = center.x + (Math.random() - 0.5) * spread.x;
    positions[i * 3 + 1] = center.y + Math.random() * spread.y;
    positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * spread.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xb7c9e6,
    size,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

function glowMat(intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x10151c,
    emissive: 0xb7c9e6,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.2,
  });
}

function buildSignals(scene: THREE.Scene, metal: THREE.Material, dark: THREE.Material): SignalBuilt[] {
  const out: SignalBuilt[] = [];

  const obelisk = new THREE.Group();
  const g1 = glowMat(2.1);
  const g2 = glowMat(1.2);
  const base = new THREE.Mesh(UNIT, dark);
  base.position.y = 0.15;
  base.scale.set(0.55, 0.3, 0.55);
  obelisk.add(base);
  const shaft = new THREE.Mesh(UNIT, metal);
  shaft.position.y = 0.95;
  shaft.scale.set(0.28, 1.5, 0.28);
  obelisk.add(shaft);
  const core = new THREE.Mesh(UNIT, g1);
  core.position.y = 1.05;
  core.scale.set(0.08, 1.15, 0.08);
  obelisk.add(core);
  const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), g2);
  cap.position.y = 1.85;
  obelisk.add(cap);
  place(out, scene, obelisk, "obelisk", [g1, g2], 1.15, 2.4);

  const consoleRoot = new THREE.Group();
  const gc = glowMat(1.6);
  const plinthC = new THREE.Mesh(UNIT, dark);
  plinthC.position.y = 0.28;
  plinthC.scale.set(1.15, 0.5, 0.62);
  consoleRoot.add(plinthC);
  const top = new THREE.Mesh(UNIT, metal);
  top.position.y = 0.58;
  top.scale.set(1.25, 0.06, 0.72);
  consoleRoot.add(top);
  const screen = new THREE.Mesh(UNIT, gc);
  screen.position.set(0, 0.78, -0.02);
  screen.scale.set(0.72, 0.28, 0.04);
  consoleRoot.add(screen);
  const ringMat = glowMat(2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.015, 12, 32), ringMat);
  ring.position.y = 1.15;
  ring.rotation.x = Math.PI / 2.4;
  ring.userData.spin = 0.8;
  consoleRoot.add(ring);
  place(out, scene, consoleRoot, "console", [gc, ringMat], 0.7, 1.8);

  const node = new THREE.Group();
  const gn = glowMat(2.2);
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), gn);
  ico.position.y = 1.25;
  ico.userData.spin = 0.35;
  node.add(ico);
  for (let i = 0; i < 3; i++) {
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.012, 8, 40), metal);
    cage.position.y = 1.25;
    cage.rotation.x = i * 0.6;
    cage.rotation.y = i * 1.1;
    cage.userData.spin = 0.45 + i * 0.15;
    node.add(cage);
  }
  const plinth = new THREE.Mesh(UNIT, dark);
  plinth.position.y = 0.18;
  plinth.scale.set(0.7, 0.36, 0.7);
  node.add(plinth);
  place(out, scene, node, "node", [gn], 1.25, 2.6);

  const slab = new THREE.Group();
  const gs = glowMat(1.8);
  const mono = new THREE.Mesh(UNIT, metal);
  mono.position.y = 0.72;
  mono.scale.set(0.62, 1.15, 0.08);
  slab.add(mono);
  const edge = new THREE.Mesh(UNIT, gs);
  edge.position.set(0.32, 0.72, 0);
  edge.scale.set(0.025, 1.15, 0.09);
  slab.add(edge);
  place(out, scene, slab, "slab", [gs], 0.85, 1.5);

  const relay = new THREE.Group();
  const gr = glowMat(2);
  const pole = new THREE.Mesh(UNIT, metal);
  pole.position.y = 0.9;
  pole.scale.set(0.08, 1.7, 0.08);
  relay.add(pole);
  for (const y of [0.7, 1.25, 1.7]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.018, 10, 28), y === 1.25 ? gr : metal);
    band.position.y = y;
    band.rotation.x = Math.PI / 2;
    band.userData.spin = 0.7;
    relay.add(band);
  }
  place(out, scene, relay, "relay", [gr], 1.2, 2.2);

  for (const signal of out) {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 1.8, 1.25),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hit.position.y = 0.9;
    signal.root.add(hit);
  }
  return out;
}

function place(
  out: SignalBuilt[],
  scene: THREE.Scene,
  root: THREE.Group,
  id: SignalId,
  glows: THREE.MeshStandardMaterial[],
  lightY: number,
  intensity: number,
) {
  const spec = SIGNALS.find((s) => s.id === id);
  if (!spec) return;
  root.position.set(spec.x, 0, spec.z);
  root.userData.signalId = id;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.012, 8, 40),
    glowMat(0.9),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  root.add(ring);
  glows.push(ring.material as THREE.MeshStandardMaterial);
  const light = new THREE.PointLight(0xb7c9e6, intensity, 6.5, 2);
  light.position.set(spec.x, lightY, spec.z);
  scene.add(root);
  scene.add(light);
  out.push({ id, root, glows, light });
}

function frame(scene: THREE.Scene, trim: THREE.Material, dark: THREE.Material, x: number, y: number, z: number, w: number, h: number, rz: number) {
  const group = new THREE.Group();
  const inner = new THREE.Mesh(UNIT, dark);
  inner.scale.set(w, h, 0.04);
  const t = 0.035;
  const top = new THREE.Mesh(UNIT, trim);
  top.position.y = h / 2;
  top.scale.set(w + t, t, 0.05);
  const bot = top.clone();
  bot.position.y = -h / 2;
  const left = new THREE.Mesh(UNIT, trim);
  left.position.x = -w / 2;
  left.scale.set(t, h, 0.05);
  const right = left.clone();
  right.position.x = w / 2;
  group.add(inner, top, bot, left, right);
  group.position.set(x, y, z);
  group.rotation.y = rz;
  scene.add(group);
}

function buildApartment(scene: THREE.Scene, m: ReturnType<typeof mats>) {
  const y = H / 2;
  // Living shell
  addBox(scene, m.wall, 0, y, 4, 16.5, H, T);
  addBox(scene, m.wall, 8, y, -4, T, H, 16.5);
  addBox(scene, m.wall, -8, y, -10.6, T, H, 2.8);
  addBox(scene, m.wall, -8, y, 0.2, T, H, 7.6);
  addBox(scene, m.wall, -8, 0.45, -6.4, T, 0.9, 5.6);
  addBox(scene, m.wall, -8, 2.96, -6.4, T, 0.92, 5.6);
  addBox(scene, m.wall, -4.75, y, -12, 6.5, H, T);
  addBox(scene, m.wall, 4.75, y, -12, 6.5, H, T);
  addBox(scene, m.wall, 0, 2.98, -12, 3, 0.88, T);

  // Gallery
  addBox(scene, m.wall, -4.5, y, -18, T, H, 12.3);
  addBox(scene, m.wall, 0, y, -24, 9.3, H, T);
  addBox(scene, m.wall, 4.5, y, -22.15, T, H, 3.7);
  addBox(scene, m.wall, 4.5, y, -14.15, T, H, 3.7);
  addBox(scene, m.wall, 4.5, 2.98, -18.3, T, 0.88, 4);

  // Study
  addBox(scene, m.wall, 4.5, y, -25, T, H, 2.2);
  addBox(scene, m.wall, 10.25, y, -12, 11.6, H, T);
  addBox(scene, m.wall, 16, y, -19, T, H, 14.2);
  addBox(scene, m.wall, 5.85, y, -26, 2.7, H, T);
  addBox(scene, m.wall, 14.7, y, -26, 2.6, H, T);
  addBox(scene, m.wall, 10.3, 0.48, -26, 6.2, 0.96, T);
  addBox(scene, m.wall, 10.3, 2.94, -26, 6.2, 0.96, T);

  // Floors and ceilings
  const floor = (x: number, z: number, w: number, d: number) => {
    const mesh = addBox(scene, m.floor, x, -0.06, z, w, 0.12, d);
    const source = m.floor.map;
    if (source) {
      const cloneMap = source.clone();
      cloneMap.repeat.set(w / 4, d / 4);
      cloneMap.needsUpdate = true;
      const next = m.floor.clone();
      next.map = cloneMap;
      mesh.material = next;
    }
  };
  floor(0, -4, 16.2, 16.2);
  floor(0, -18, 9.1, 12.2);
  floor(10.25, -19, 11.6, 14.2);

  addBox(scene, m.ceil, 0, H - 0.05, -4, 16.2, 0.1, 16.2);
  addBox(scene, m.ceil, 0, H - 0.05, -18, 9.1, 0.1, 12.2);
  addBox(scene, m.ceil, 10.25, H - 0.05, -19, 11.6, 0.1, 14.2);

  // Light slots
  addBox(scene, m.glow, 0, H - 0.12, -5, 0.06, 0.03, 9);
  addBox(scene, m.glow, 0, H - 0.12, -18, 0.05, 0.03, 8);
  addBox(scene, m.glow, 10.2, H - 0.12, -19, 7, 0.03, 0.05);

  // Furniture
  addBox(scene, m.cloth, -2.35, 0.32, 0.85, 2.4, 0.58, 1.15);
  addBox(scene, m.cloth, -2.35, 0.62, 1.28, 2.4, 0.48, 0.28);
  addBox(scene, m.metal, -2.15, 0.34, -0.75, 1.2, 0.06, 0.68);
  addBox(scene, m.dark, -1.4, 0.015, 0.15, 4.2, 0.02, 3.4);
  addBox(scene, m.trim, -7.25, 0.28, -6.4, 0.55, 0.42, 2.5);
  addBox(scene, m.cloth, 2.35, 0.36, -15.2, 0.55, 0.42, 1.5);
  addBox(scene, m.metal, 9.35, 0.74, -14.35, 3.3, 0.07, 0.86);
  addBox(scene, m.dark, 9.35, 0.36, -14.35, 3.1, 0.68, 0.72);
  addBox(scene, m.cloth, 9.35, 0.42, -15.45, 0.52, 0.46, 0.5);
  addBox(scene, m.trim, 15.2, 1.35, -20, 0.36, 2.5, 4.4);

  const city = new THREE.MeshBasicMaterial({ map: cityTexture() });
  const westWin = new THREE.Mesh(UNIT, city);
  westWin.position.set(-8.35, 1.7, -6.4);
  westWin.scale.set(0.05, 1.55, 5.4);
  scene.add(westWin);
  const glassW = new THREE.Mesh(UNIT, m.glass);
  glassW.position.set(-7.86, 1.7, -6.4);
  glassW.scale.set(0.02, 1.55, 5.4);
  scene.add(glassW);

  const northWin = new THREE.Mesh(UNIT, new THREE.MeshBasicMaterial({ map: cityTexture() }));
  northWin.position.set(10.3, 1.7, -26.35);
  northWin.scale.set(6, 1.45, 0.05);
  scene.add(northWin);
  const glassN = new THREE.Mesh(UNIT, m.glass);
  glassN.position.set(10.3, 1.7, -25.86);
  glassN.scale.set(6, 1.45, 0.02);
  scene.add(glassN);

  frame(scene, m.trim, m.dark, -4.28, 1.6, -15.2, 1.15, 1.7, Math.PI / 2);
  frame(scene, m.trim, m.dark, -4.28, 1.6, -18.3, 1.15, 1.7, Math.PI / 2);
  frame(scene, m.trim, m.dark, -4.28, 1.6, -21.4, 1.15, 1.7, Math.PI / 2);

  // Books
  for (let i = 0; i < 14; i++) {
    const book = new THREE.Mesh(UNIT, i % 3 === 0 ? m.trim : m.dark);
    book.position.set(15.02, 0.55 + (i % 5) * 0.42, -21.7 + (i % 7) * 0.48);
    book.scale.set(0.18, 0.32, 0.08 + (i % 3) * 0.02);
    scene.add(book);
  }

  scene.add(new THREE.AmbientLight(0xb7c6dc, 0.34));
  const hemi = new THREE.HemisphereLight(0x9eb0c8, 0x07080a, 0.62);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xd5e0ee, 0.55);
  sun.position.set(-6, 8, 2);
  scene.add(sun);
  const windowLight = new THREE.PointLight(0x9db4d4, 6, 14, 2);
  windowLight.position.set(-6.4, 1.8, -6.4);
  scene.add(windowLight);
  const studyLight = new THREE.PointLight(0xc5d4ea, 4, 12, 2);
  studyLight.position.set(10, 2.4, -20);
  scene.add(studyLight);

  scene.fog = new THREE.FogExp2(0x07080b, 0.045);
  scene.background = new THREE.Color(0x07080b);
}

function buildGate(scene: THREE.Scene, m: ReturnType<typeof mats>): { doorL: THREE.Group; doorR: THREE.Group } {
  addBox(scene, m.floor, 0, -0.06, 1, 14, 0.12, 18);
  addBox(scene, m.dark, 0, 0.02, 1.2, 6, 0.02, 8);

  const jambL = addBox(scene, m.trim, -1.72, 2.35, 0, 0.28, 4.7, 0.45);
  const jambR = jambL.clone();
  jambR.position.x = 1.72;
  scene.add(jambR);
  addBox(scene, m.trim, 0, 4.7, 0, 3.7, 0.28, 0.5);

  const seam = glowMat(2.4);
  const seamMesh = new THREE.Mesh(UNIT, seam);
  seamMesh.position.set(0, 2.3, 0.02);
  seamMesh.scale.set(0.035, 4.3, 0.02);
  scene.add(seamMesh);

  function door(side: number): THREE.Group {
    const hinge = new THREE.Group();
    hinge.position.set(side * 1.55, 0, 0);
    const panel = new THREE.Mesh(UNIT, m.dark);
    panel.position.set(side * -0.74, 2.3, 0);
    panel.scale.set(1.48, 4.35, 0.16);
    const inset = new THREE.Mesh(UNIT, m.trim);
    inset.position.set(side * -0.74, 2.35, 0.09);
    inset.scale.set(1.1, 3.5, 0.02);
    const edge = new THREE.Mesh(UNIT, seam);
    edge.position.set(side * -0.08, 2.3, 0.1);
    edge.scale.set(0.025, 4.15, 0.02);
    hinge.add(panel, inset, edge);
    scene.add(hinge);
    return hinge;
  }

  const doorL = door(1);
  const doorR = door(-1);

  scene.add(new THREE.AmbientLight(0x93a4b8, 0.12));
  const key = new THREE.PointLight(0xd5e2f4, 18, 16, 2);
  key.position.set(0, 2.4, 2.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8ea6c8, 0.35);
  rim.position.set(0, 6, 8);
  scene.add(rim);

  scene.fog = new THREE.FogExp2(0x050506, 0.085);
  scene.background = new THREE.Color(0x050506);
  return { doorL, doorR };
}

export function buildWorld(): WorldBuilt {
  const m = mats();
  const apartment = new THREE.Scene();
  const gate = new THREE.Scene();
  buildApartment(apartment, m);
  const signals = buildSignals(apartment, m.metal, m.dark);
  const { doorL, doorR } = buildGate(gate, m);
  const gateDust = dust(160, new THREE.Vector3(8, 5, 10), new THREE.Vector3(0, 0, 1), 0.035);
  gate.add(gateDust);
  const aptDust = dust(90, new THREE.Vector3(22, 3, 28), new THREE.Vector3(4, 0, -12), 0.03);
  apartment.add(aptDust);
  return { apartment, gate, signals, doorL, doorR, dust: aptDust, gateDust };
}

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
  lantern: THREE.PointLight;
};

const UNIT = new THREE.BoxGeometry(1, 1, 1);

type MatName = "wall" | "floor" | "ceil" | "trim" | "cloth" | "metal" | "glass" | "dark" | "glow";

function mats(): Record<MatName, THREE.MeshStandardMaterial> {
  return {
    wall: new THREE.MeshStandardMaterial({ color: 0xffe0c4, roughness: 0.78, metalness: 0.02 }),
    floor: new THREE.MeshStandardMaterial({
      color: 0xe7b56a,
      roughness: 0.55,
      metalness: 0.04,
      map: floorTexture(),
    }),
    ceil: new THREE.MeshStandardMaterial({ color: 0xfff6ea, roughness: 0.8, metalness: 0 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xc9844a, roughness: 0.48, metalness: 0.08 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0xe26b58, roughness: 0.78, metalness: 0 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xf0c56a, roughness: 0.28, metalness: 0.55 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xcfe8ff,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x6b4632, roughness: 0.62, metalness: 0.08 }),
    glow: new THREE.MeshStandardMaterial({
      color: 0xfff1c2,
      emissive: 0xffc15a,
      emissiveIntensity: 1.6,
      roughness: 0.35,
      metalness: 0.05,
    }),
  };
}

function floorTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  if (!g) return tex;
  const tones = ["#e4b56e", "#f3cf96", "#d7a15a", "#f7ddb0", "#c9924e", "#efc07a"];
  g.fillStyle = "#b88848";
  g.fillRect(0, 0, 512, 512);
  const plankH = 36;
  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * 72;
    for (let x = -144; x < 560; x += 144) {
      const px = x + offset;
      const tone = tones[(row * 5 + Math.floor(x / 144) + 6) % tones.length] ?? "#e4b56e";
      g.fillStyle = tone;
      g.fillRect(px + 2, row * plankH + 2, 138, plankH - 4);
      g.strokeStyle = "rgba(92, 52, 22, 0.22)";
      g.strokeRect(px + 2, row * plankH + 2, 138, plankH - 4);
    }
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function cityTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  if (!g) return tex;
  const sky = g.createLinearGradient(0, 0, 0, 768);
  sky.addColorStop(0, "#7ec8ff");
  sky.addColorStop(0.45, "#ffd29a");
  sky.addColorStop(1, "#f08a62");
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 768);
  const towers = ["#f27d6b", "#ffd36a", "#7dcdb8", "#f4efe4", "#e07aa8"];
  for (let i = 0; i < 9; i++) {
    const w = 36 + (i % 3) * 12;
    const h = 180 + ((i * 97) % 280);
    const x = 16 + i * 54;
    g.fillStyle = towers[i % towers.length] ?? "#ffd36a";
    g.fillRect(x, 768 - h, w, h);
    g.fillStyle = "rgba(255,244,214,0.85)";
    for (let y = 768 - h + 16; y < 740; y += 18) {
      for (let wx = x + 6; wx < x + w - 6; wx += 12) g.fillRect(wx, y, 6, 8);
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

function dust(count: number, spread: THREE.Vector3, center: THREE.Vector3, size: number, color = 0xffe3a1): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = center.x + (Math.random() - 0.5) * spread.x;
    positions[i * 3 + 1] = center.y + Math.random() * spread.y;
    positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * spread.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

function glowMat(intensity: number, emissive = 0xffc15a): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: emissive,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.28,
    metalness: 0.08,
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
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.036, 10, 48), glowMat(2.1, 0xffe08a));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  root.add(ring);
  glows.push(ring.material as THREE.MeshStandardMaterial);
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0xfff6dd,
    emissive: 0xffd27a,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.18,
    roughness: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.2, 2.05, 16, 1, true), columnMat);
  column.position.y = 1.12;
  root.add(column);
  glows.push(columnMat);
  const light = new THREE.PointLight(0xffc56b, intensity, 9, 1.35);
  light.position.set(spec.x, lightY, spec.z);
  scene.add(root);
  scene.add(light);
  out.push({ id, root, glows, light });
}

function frame(scene: THREE.Scene, trim: THREE.Material, _dark: THREE.Material, x: number, y: number, z: number, w: number, h: number, rz: number) {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 220;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (g) {
    const colors = ["#e07aa8", "#355c9a", "#2aa8a0", "#f2c14e", "#e15b4c"];
    const pick = colors[Math.abs(Math.round(x * 3 + z)) % colors.length] ?? "#355c9a";
    g.fillStyle = pick;
    g.fillRect(0, 0, 160, 220);
    g.fillStyle = "#fff6ea";
    g.beginPath();
    g.arc(80, 100, 48, 0, Math.PI * 2);
    g.fill();
  }
  const group = new THREE.Group();
  const inner = new THREE.Mesh(UNIT, new THREE.MeshBasicMaterial({ map: tex }));
  inner.scale.set(w, h, 0.04);
  const t = 0.06;
  const top = new THREE.Mesh(UNIT, trim);
  top.position.y = h / 2;
  top.scale.set(w + t, t, 0.07);
  const bot = top.clone();
  bot.position.y = -h / 2;
  const left = new THREE.Mesh(UNIT, trim);
  left.position.x = -w / 2;
  left.scale.set(t, h, 0.07);
  const right = left.clone();
  right.position.x = w / 2;
  group.add(inner, top, bot, left, right);
  group.position.set(x, y, z);
  group.rotation.y = rz;
  scene.add(group);
}

function matColor(color: number, roughness = 0.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });
}

function bulb(scene: THREE.Scene, x: number, y: number, z: number, color: number) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff6dd, emissive: color, emissiveIntensity: 2.2, roughness: 0.3 }),
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

function lampLight(scene: THREE.Scene, x: number, y: number, z: number, intensity: number, color: number) {
  const light = new THREE.PointLight(color, intensity, 11, 1.5);
  light.position.set(x, y, z);
  scene.add(light);
}

function plant(scene: THREE.Scene, x: number, z: number, scale = 1) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.14 * scale, 0.24 * scale, 12), matColor(0xd36b45, 0.5));
  pot.position.set(x, 0.12 * scale, z);
  const colors = [0x2f9d62, 0x46c07a, 0x1f8a68];
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 12, 10), matColor(colors[i % colors.length] ?? 0x2f9d62, 0.65));
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(x + Math.cos(a) * 0.12 * scale, (0.38 + (i % 2) * 0.16) * scale, z + Math.sin(a) * 0.1 * scale);
    leaf.scale.set(1, 0.72, 0.85);
    scene.add(leaf);
  }
  scene.add(pot);
}

function floorLamp(scene: THREE.Scene, x: number, z: number, shade: number) {
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.28, 10), matColor(0xf2d7a2, 0.35));
  stand.position.set(x, 0.64, z);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 12), matColor(0xf0c56a, 0.35));
  foot.position.set(x, 0.03, z);
  const shadeMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.32, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: shade, emissive: shade, emissiveIntensity: 0.55, roughness: 0.45, side: THREE.DoubleSide }),
  );
  shadeMesh.position.set(x, 1.32, z);
  bulb(scene, x, 1.18, z, 0xffc56b);
  scene.add(stand, foot, shadeMesh);
}

function chandelier(scene: THREE.Scene, x: number, y: number, z: number) {
  const gold = matColor(0xe8b15a, 0.32);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), gold);
  hub.position.set(x, y, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.028, 10, 28), gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y - 0.02, z);
  scene.add(hub, ring);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.09, 0.11, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: 0xffd089, emissiveIntensity: 0.7, roughness: 0.42 }),
    );
    shade.position.set(x + Math.cos(a) * 0.36, y - 0.1, z + Math.sin(a) * 0.36);
    scene.add(shade);
  }
}

function pendant(scene: THREE.Scene, x: number, y: number, z: number, color: number) {
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 6), matColor(0x8a5a32, 0.45));
  cord.position.set(x, y + 0.2, z);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.26, 16, 1, true),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.75, roughness: 0.4, side: THREE.DoubleSide }),
  );
  shade.position.set(x, y - 0.06, z);
  bulb(scene, x, y - 0.1, z, 0xffe7b0);
  lampLight(scene, x, y - 0.15, z, 5, 0xffe2b0);
  scene.add(cord, shade);
}

function art(scene: THREE.Scene, x: number, y: number, z: number, rz: number, a: string, b: string) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 160;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (g) {
    g.fillStyle = a;
    g.fillRect(0, 0, 128, 160);
    g.fillStyle = b;
    g.beginPath();
    g.arc(64, 78, 34, 0, Math.PI * 2);
    g.fill();
  }
  const group = new THREE.Group();
  const frameMesh = new THREE.Mesh(UNIT, matColor(0xf2c14e, 0.4));
  frameMesh.scale.set(0.72, 0.92, 0.05);
  const canvas = new THREE.Mesh(UNIT, new THREE.MeshBasicMaterial({ map: tex }));
  canvas.position.z = 0.035;
  canvas.scale.set(0.56, 0.74, 0.02);
  group.add(frameMesh, canvas);
  group.position.set(x, y, z);
  group.rotation.y = rz;
  scene.add(group);
}

function rug(scene: THREE.Scene, x: number, z: number, w: number, d: number, a: string, b: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (g) {
    g.fillStyle = a;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = b;
    g.lineWidth = 14;
    g.strokeRect(18, 18, 220, 220);
    g.fillStyle = b;
    g.beginPath();
    g.arc(128, 128, 26, 0, Math.PI * 2);
    g.fill();
  }
  const mesh = new THREE.Mesh(UNIT, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  mesh.position.set(x, 0.02, z);
  mesh.scale.set(w, 0.02, d);
  scene.add(mesh);
}

function sofa(scene: THREE.Scene, x: number, z: number, rot: number, cloth: number, cushion: number, width = 2.15) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const fabric = matColor(cloth, 0.72);
  const seat = matColor(cushion, 0.62);
  const wood = matColor(0x8a5a32, 0.48);
  const depth = 0.9;
  const base = new THREE.Mesh(UNIT, fabric);
  base.position.set(0, 0.28, 0);
  base.scale.set(width, 0.22, depth);
  const back = new THREE.Mesh(UNIT, fabric);
  back.position.set(0, 0.58, -depth / 2 + 0.09);
  back.scale.set(width, 0.52, 0.16);
  g.add(base, back);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(UNIT, fabric);
    arm.position.set(sx * (width / 2 - 0.08), 0.42, 0.02);
    arm.scale.set(0.14, 0.26, depth * 0.82);
    g.add(arm);
  }
  const pillow = new THREE.Mesh(UNIT, matColor(0xf2c14e, 0.55));
  pillow.position.set(width * 0.18, 0.48, 0.12);
  pillow.scale.set(0.28, 0.16, 0.16);
  g.add(pillow);
  scene.add(g);
}

function coffeeTable(scene: THREE.Scene, x: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const top = new THREE.Mesh(UNIT, matColor(0xf0c56a, 0.32));
  top.position.y = 0.36;
  top.scale.set(1.15, 0.06, 0.62);
  const book = new THREE.Mesh(UNIT, matColor(0x355c9a, 0.55));
  book.position.set(-0.18, 0.42, 0);
  book.scale.set(0.28, 0.04, 0.2);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.1, 12), matColor(0xfff3df, 0.4));
  mug.position.set(0.26, 0.45, -0.04);
  g.add(top, book, mug);
  scene.add(g);
}

function shelf(scene: THREE.Scene, x: number, y: number, z: number, rot: number, len = 1.3) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;
  const board = new THREE.Mesh(UNIT, matColor(0xf0c56a, 0.38));
  board.scale.set(len, 0.05, 0.2);
  g.add(board);
  const colors = [0xe15b4c, 0x355c9a, 0x2aa8a0, 0xf2c14e, 0xe07aa8];
  for (let i = 0; i < 4; i++) {
    const book = new THREE.Mesh(UNIT, matColor(colors[i % colors.length] ?? 0xe15b4c, 0.5));
    book.position.set(-len / 2 + 0.2 + i * 0.24, 0.16, 0);
    book.scale.set(0.1, 0.26, 0.14);
    g.add(book);
  }
  scene.add(g);
}

function bench(scene: THREE.Scene, x: number, z: number, rot: number, cloth: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const seat = new THREE.Mesh(UNIT, matColor(cloth, 0.62));
  seat.position.y = 0.34;
  seat.scale.set(1.2, 0.08, 0.32);
  const back = new THREE.Mesh(UNIT, matColor(cloth, 0.62));
  back.position.set(0, 0.5, -0.11);
  back.scale.set(1.2, 0.26, 0.06);
  g.add(seat, back);
  scene.add(g);
}

function furnish(scene: THREE.Scene) {
  rug(scene, -1.6, 0.3, 4.4, 2.8, "#f6efe2", "#e26b58");
  rug(scene, 2.5, -6.6, 4.2, 3.2, "#fff6ea", "#2aa8a0");
  rug(scene, 0.05, -18.2, 3.6, 7.2, "#e7f6f3", "#e07aa8");
  rug(scene, 10.1, -19.4, 6.2, 7.2, "#fff1ea", "#e15b4c");

  sofa(scene, -2.35, 0.85, 0, 0xe26b58, 0xfff3df, 2.25);
  coffeeTable(scene, -2.15, -0.7);
  sofa(scene, 2.55, -7.25, 0, 0x3d7ea6, 0xfff3df, 2.05);
  coffeeTable(scene, 2.55, -6.15);
  sofa(scene, -4.7, -5.0, Math.PI / 2, 0x2aa8a0, 0xfff3df, 0.86);
  plant(scene, 7.55, 2.7, 0.75);
  plant(scene, -7.55, -4.4, 0.9);
  plant(scene, 3.55, -23.65, 0.8);
  plant(scene, 7.2, -25.7, 0.75);
  plant(scene, 15.65, -14.9, 0.75);

  floorLamp(scene, 6.55, -6.45, 0xf2c14e);
  floorLamp(scene, 13.45, -16.15, 0xfff3df);
  chandelier(scene, 0, 2.72, -5.4);
  chandelier(scene, 0, 2.72, -18);
  chandelier(scene, 10.2, 2.7, -19);
  pendant(scene, -2.2, 2.35, 0.15, 0xfff3df);
  pendant(scene, 8.6, 2.35, -21.4, 0xf2c14e);

  art(scene, 0.2, 1.75, 3.72, Math.PI, "#e15b4c", "#fff3df");
  art(scene, -3.4, 1.75, 3.72, Math.PI, "#2aa8a0", "#ffd36a");
  art(scene, 7.72, 1.7, -4.2, -Math.PI / 2, "#355c9a", "#ffd36a");
  art(scene, 7.72, 1.7, -6.6, -Math.PI / 2, "#e07aa8", "#fff3df");
  art(scene, 4.22, 1.7, -15.2, -Math.PI / 2, "#2aa8a0", "#fff3df");
  art(scene, 4.22, 1.7, -21.2, -Math.PI / 2, "#e07aa8", "#ffd36a");
  art(scene, -4.22, 1.7, -17.4, Math.PI / 2, "#355c9a", "#ffd36a");
  art(scene, 15.72, 1.8, -18.4, -Math.PI / 2, "#f2c14e", "#355c9a");

  shelf(scene, -3.1, 1.55, 3.64, Math.PI);
  shelf(scene, 2.5, 1.55, 3.64, Math.PI);
  shelf(scene, 7.7, 1.5, -1.1, -Math.PI / 2);
  shelf(scene, -7.7, 1.5, -2.2, Math.PI / 2);
  shelf(scene, 0.1, 1.6, -23.72, 0, 1.5);
  shelf(scene, 15.74, 1.55, -20.8, -Math.PI / 2, 1.4);
  bench(scene, -4.22, -14.5, Math.PI / 2, 0x2aa8a0);
  bench(scene, -4.22, -21.2, Math.PI / 2, 0xe07aa8);
  bench(scene, 4.24, -22.5, -Math.PI / 2, 0xf2c14e);
  bench(scene, 15.74, -17.4, -Math.PI / 2, 0xe26b58);
  bench(scene, 15.74, -22.6, -Math.PI / 2, 0x3d7ea6);

  const neon = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.03, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x7dfff2, emissive: 0x2ee6c8, emissiveIntensity: 2.4, roughness: 0.3 }),
  );
  neon.position.set(6.9, 2.15, -2.4);
  neon.rotation.y = -Math.PI / 2;
  scene.add(neon);

  const screen = new THREE.Mesh(
    UNIT,
    new THREE.MeshStandardMaterial({ color: 0xd7fff8, emissive: 0x5ce1ff, emissiveIntensity: 1.8, roughness: 0.25 }),
  );
  screen.position.set(9.35, 1.22, -14.05);
  screen.scale.set(0.86, 0.5, 0.04);
  scene.add(screen);
}

function buildApartment(scene: THREE.Scene, m: ReturnType<typeof mats>): THREE.PointLight {
  const y = H / 2;
  const living = m.wall.clone();
  living.color.set(0xffd8b4);
  const gallery = m.wall.clone();
  gallery.color.set(0xf6d4ef);
  const study = m.wall.clone();
  study.color.set(0xfff0c2);
  // Living shell
  addBox(scene, living, 0, y, 4, 16.5, H, T);
  addBox(scene, living, 8, y, -4, T, H, 16.5);
  addBox(scene, living, -8, y, -10.6, T, H, 2.8);
  addBox(scene, living, -8, y, 0.2, T, H, 7.6);
  addBox(scene, living, -8, 0.45, -6.4, T, 0.9, 5.6);
  addBox(scene, living, -8, 2.96, -6.4, T, 0.92, 5.6);
  addBox(scene, living, -4.75, y, -12, 6.5, H, T);
  addBox(scene, living, 4.75, y, -12, 6.5, H, T);
  addBox(scene, living, 0, 2.98, -12, 3, 0.88, T);

  // Gallery
  addBox(scene, gallery, -4.5, y, -18, T, H, 12.3);
  addBox(scene, gallery, 0, y, -24, 9.3, H, T);
  addBox(scene, gallery, 4.5, y, -22.15, T, H, 3.7);
  addBox(scene, gallery, 4.5, y, -14.15, T, H, 3.7);
  addBox(scene, gallery, 4.5, 2.98, -18.3, T, 0.88, 4);

  // Study
  addBox(scene, study, 4.5, y, -25, T, H, 2.2);
  addBox(scene, study, 10.25, y, -12, 11.6, H, T);
  addBox(scene, study, 16, y, -19, T, H, 14.2);
  addBox(scene, study, 5.85, y, -26, 2.7, H, T);
  addBox(scene, study, 14.7, y, -26, 2.6, H, T);
  addBox(scene, study, 10.3, 0.48, -26, 6.2, 0.96, T);
  addBox(scene, study, 10.3, 2.94, -26, 6.2, 0.96, T);

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

  const discMat = new THREE.MeshStandardMaterial({
    color: 0xfff6dd,
    emissive: 0xffe1a8,
    emissiveIntensity: 1.6,
    roughness: 0.35,
  });
  for (const [x, z] of [
    [0, -5.2],
    [-4.2, -3],
    [0, -18],
    [10.2, -16.5],
    [10.2, -22],
  ] as const) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20), discMat);
    disc.position.set(x, H - 0.08, z);
    scene.add(disc);
  }

  addBox(scene, m.metal, 9.35, 0.74, -14.35, 3.3, 0.07, 0.86);
  addBox(scene, m.dark, 9.35, 0.36, -14.35, 3.1, 0.68, 0.72);
  addBox(scene, m.cloth, 9.35, 0.42, -15.45, 0.52, 0.46, 0.5);
  addBox(scene, m.trim, 15.2, 1.35, -20, 0.36, 2.5, 4.4);
  addBox(scene, m.cloth, -7.22, 0.28, -6.4, 0.48, 0.28, 2.2);

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

  for (let i = 0; i < 14; i++) {
    const book = new THREE.Mesh(UNIT, matColor(i % 3 === 0 ? 0xe15b4c : i % 3 === 1 ? 0x2aa8a0 : 0x355c9a, 0.5));
    book.position.set(15.02, 0.55 + (i % 5) * 0.42, -21.7 + (i % 7) * 0.48);
    book.scale.set(0.18, 0.32, 0.08 + (i % 3) * 0.02);
    scene.add(book);
  }

  furnish(scene);

  scene.add(new THREE.AmbientLight(0xfff7ee, 1.15));
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xf0b27a, 1.3));
  const sun = new THREE.DirectionalLight(0xfff8ee, 0.9);
  sun.position.set(4, 16, -4);
  sun.target.position.set(4, 0, -12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 48;
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  const windowLight = new THREE.PointLight(0xfff6df, 16, 18, 1.5);
  windowLight.position.set(-6.2, 2.1, -6.4);
  scene.add(windowLight);
  const studyWindow = new THREE.PointLight(0xffe8c4, 14, 16, 1.5);
  studyWindow.position.set(10.3, 2.2, -24.4);
  scene.add(studyWindow);
  lampLight(scene, 0, 2.65, -5.2, 16, 0xffe0a8);
  lampLight(scene, 0, 2.65, -18, 14, 0xffd18a);
  lampLight(scene, 10.2, 2.6, -19, 16, 0xffe2b0);
  lampLight(scene, 6.55, 1.45, -6.45, 8, 0xffc56b);
  lampLight(scene, 13.4, 1.4, -16.2, 8, 0xffd27a);

  const lantern = new THREE.PointLight(0xfff6e4, 2.6, 8.5, 1.5);
  lantern.position.set(0.15, 2.15, 2.4);
  scene.add(lantern);

  scene.fog = new THREE.FogExp2(0x070708, 0.003);
  scene.background = new THREE.Color(0x070708);

  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.receiveShadow = true;
    const mat = mesh.material as THREE.Material | THREE.Material[];
    const transparent = Array.isArray(mat) ? mat.some((item) => item.transparent) : Boolean(mat?.transparent);
    mesh.castShadow = !transparent;
  });
  return lantern;
}

function buildGate(scene: THREE.Scene, _m: ReturnType<typeof mats>): { doorL: THREE.Group; doorR: THREE.Group } {
  const floor = new THREE.MeshStandardMaterial({ color: 0x0e1013, roughness: 0.38, metalness: 0.62 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.8, metalness: 0.1 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.55, metalness: 0.35 });
  addBox(scene, floor, 0, -0.06, 1, 14, 0.12, 18);
  addBox(scene, dark, 0, 0.02, 1.2, 6, 0.02, 8);

  const jambL = addBox(scene, trim, -1.72, 2.35, 0, 0.28, 4.7, 0.45);
  const jambR = jambL.clone();
  jambR.position.x = 1.72;
  scene.add(jambR);
  addBox(scene, trim, 0, 4.7, 0, 3.7, 0.28, 0.5);

  const seam = glowMat(2.4, 0xd5e2f4);
  const seamMesh = new THREE.Mesh(UNIT, seam);
  seamMesh.position.set(0, 2.3, 0.02);
  seamMesh.scale.set(0.035, 4.3, 0.02);
  scene.add(seamMesh);

  function door(side: number): THREE.Group {
    const hinge = new THREE.Group();
    hinge.position.set(side * 1.55, 0, 0);
    const panel = new THREE.Mesh(UNIT, dark);
    panel.position.set(side * -0.74, 2.3, 0);
    panel.scale.set(1.48, 4.35, 0.16);
    const inset = new THREE.Mesh(UNIT, trim);
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
  const key = new THREE.PointLight(0xd5e2f4, 2.2, 14, 2);
  key.position.set(0, 2.4, 2.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8ea6c8, 0.35);
  rim.position.set(0, 6, 8);
  scene.add(rim);

  scene.fog = new THREE.FogExp2(0x070708, 0.085);
  scene.background = new THREE.Color(0x070708);
  return { doorL, doorR };
}

export function buildWorld(): WorldBuilt {
  const m = mats();
  const apartment = new THREE.Scene();
  const gate = new THREE.Scene();
  const lantern = buildApartment(apartment, m);
  const signals = buildSignals(apartment, m.metal, m.dark);
  const { doorL, doorR } = buildGate(gate, m);
  const gateDust = dust(160, new THREE.Vector3(8, 5, 10), new THREE.Vector3(0, 0, 1), 0.035, 0xb7c9e6);
  gate.add(gateDust);
  const aptDust = dust(140, new THREE.Vector3(22, 3, 28), new THREE.Vector3(4, 0.4, -12), 0.045);
  apartment.add(aptDust);
  return { apartment, gate, signals, doorL, doorR, dust: aptDust, gateDust, lantern };
}

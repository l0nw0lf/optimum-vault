import type { Pt, RoomId } from "@/game/types";

export const EYE = 1.64;
export const RADIUS = 0.32;
export const H = 3.42;
export const T = 0.26;

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Areas the player center may occupy. Pre-inset so they don't clip walls. */
export const WALK: Rect[] = [
  { minX: -7.42, maxX: 7.42, minZ: -11.48, maxZ: 3.38 },
  { minX: -1.12, maxX: 1.12, minZ: -12.7, maxZ: -11.2 },
  { minX: -3.95, maxX: 3.95, minZ: -23.42, maxZ: -12.42 },
  { minX: 3.55, maxX: 5.45, minZ: -19.9, maxZ: -16.7 },
  { minX: 5.05, maxX: 15.42, minZ: -25.42, maxZ: -12.55 },
];

/** Forbidden zones for the player center (already expanded). */
export const BLOCKS: Rect[] = [
  { minX: -3.9, maxX: -0.75, minZ: -0.05, maxZ: 1.75 },
  { minX: -3.05, maxX: -1.1, minZ: -1.4, maxZ: -0.1 },
  { minX: 7.35, maxX: 11.55, minZ: -15.15, maxZ: -13.5 },
  { minX: 14.65, maxX: 16.1, minZ: -22.5, maxZ: -17.4 },
];

export const SPAWN = { x: 0.15, z: 2.4 };

export type SignalId = "obelisk" | "console" | "node" | "slab" | "relay";

export const SIGNALS: { id: SignalId; name: string; x: number; z: number }[] = [
  { id: "obelisk", name: "Obelisk", x: -5.7, z: -7.5 },
  { id: "console", name: "Console", x: 5.55, z: -2.55 },
  { id: "node", name: "Node", x: 0.15, z: -18.35 },
  { id: "slab", name: "Slab", x: 9.35, z: -14.35 },
  { id: "relay", name: "Relay", x: 12.9, z: -23.35 },
];

export function signalName(id: string): string {
  return SIGNALS.find((s) => s.id === id)?.name ?? "Signal";
}

const DOOR_LG: Pt = { x: 0, z: -12.05 };
const DOOR_GS: Pt = { x: 4.55, z: -18.25 };

const ORDER: RoomId[] = ["living", "gallery", "study"];

export function roomAt(x: number, z: number): RoomId | null {
  if (x >= 5.05 && x <= 15.5 && z <= -12.5 && z >= -25.5) return "study";
  if (x >= -4.05 && x <= 4.05 && z <= -12.35 && z >= -23.5) return "gallery";
  if (x >= -7.5 && x <= 7.5 && z <= 3.45 && z >= -11.55) return "living";
  if (x >= -1.3 && x <= 1.3 && z <= -11.45 && z >= -12.5) return "gallery";
  if (x >= 3.7 && x <= 5.3 && z <= -16.5 && z >= -20.1) return "study";
  return null;
}

const BODIES: Record<
  RoomId,
  { minX: number; maxX: number; minZ: number; maxZ: number; sx: number; sz: number }
> = {
  living: { minX: -7.3, maxX: 7.3, minZ: -11.35, maxZ: 3.2, sx: 0, sz: -4 },
  gallery: { minX: -3.85, maxX: 3.85, minZ: -23.2, maxZ: -12.55, sx: 0, sz: -18 },
  study: { minX: 5.25, maxX: 15.2, minZ: -25.2, maxZ: -12.75, sx: 10, sz: -19 },
};

export function zoneKey(x: number, z: number): string | null {
  const room = roomAt(x, z);
  if (!room) return null;
  const b = BODIES[room];
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return null;
  const col = x >= b.sx ? 1 : 0;
  const row = z <= b.sz ? 1 : 0;
  return `${room}-${row * 2 + col}`;
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function resolveRoom(p: Pt): RoomId {
  return roomAt(p.x, p.z) ?? "living";
}

export function routeLength(a: Pt, b: Pt): number {
  const ra = resolveRoom(a);
  const rb = resolveRoom(b);
  if (ra === rb) return dist(a, b);
  const seq: Pt[] = [a];
  const ia = ORDER.indexOf(ra);
  const ib = ORDER.indexOf(rb);
  const step = ia < ib ? 1 : -1;
  for (let i = ia; i !== ib; i += step) {
    const from = ORDER[i];
    const to = ORDER[i + step];
    const crossing =
      (from === "living" && to === "gallery") || (from === "gallery" && to === "living");
    seq.push(crossing ? DOOR_LG : DOOR_GS);
  }
  seq.push(b);
  let total = 0;
  for (let i = 0; i < seq.length - 1; i++) total += dist(seq[i]!, seq[i + 1]!);
  return total;
}

export function canOccupy(x: number, z: number): boolean {
  const inside = WALK.some((w) => x >= w.minX && x <= w.maxX && z >= w.minZ && z <= w.maxZ);
  if (!inside) return false;
  return !BLOCKS.some((b) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);
}

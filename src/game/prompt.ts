import type { VibeId } from "@/game/types";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)] as T;
}

const POOLS: Record<
  VibeId,
  {
    outfit: string[];
    accent: string[];
    pose: string[];
    expression: string[];
    background: string[];
    accessory: string[];
  }
> = {
  flexnode: {
    outfit: ["a streetwear jacket", "a hoodie", "a tracksuit"],
    accent: ["electric blue accents", "neon green accents", "cyan accents"],
    pose: ["a dynamic leaning pose", "an action pose"],
    expression: ["a confident smirk", "an intense stare"],
    background: ["an urban rooftop", "a city night skyline", "a neon-lit street"],
    accessory: ["a thin chain", "a snapback worn backward", "sport gloves", "no extra accessory"],
  },
  validator: {
    outfit: ["a tactical vest", "a formal jacket", "a structured coat"],
    accent: ["silver accents", "white accents", "icy blue accents"],
    pose: ["a calm upright pose", "an arms-folded pose"],
    expression: ["a neutral focused expression", "a sharp analytical expression"],
    background: ["a clean minimal studio", "a data grid", "a white void"],
    accessory: ["a slim earpiece", "a metal lapel pin", "no extra accessory"],
  },
  propagator: {
    outfit: ["an explorer jacket", "a utility vest", "a cargo outfit"],
    accent: ["teal accents", "forest green accents", "amber accents"],
    pose: ["a mid-stride pose", "a looking-around pose"],
    expression: ["a curious expression", "a wide-eyed expression"],
    background: ["an expansive network grid", "open terrain", "a galaxy"],
    accessory: ["a field strap", "a small satchel", "binoculars at the chest", "no extra accessory"],
  },
  architect: {
    outfit: ["a sleek turtleneck", "a structured blazer", "a designer fit"],
    accent: ["gold accents", "amber accents", "deep violet accents"],
    pose: ["an arms-crossed pose", "a chin-resting-on-hand pose"],
    expression: ["a sharp composed expression", "an authoritative expression"],
    background: ["geometric architecture", "a blueprint grid", "dark marble"],
    accessory: ["a slim ring", "architectural glasses pushed up", "no extra accessory"],
  },
};

const BASE_APPEARANCE =
  "a tall cream flame-shaped head of smooth rounded peaks, a deep notch on the upper left and a dripping rounded lobe on the right, a glossy black leather infinity-symbol mask, one large pinkish-brown eye visible in the right loop, no human hair, no human nose or mouth, smooth matte cream skin, a short thick neck, and a simple rounded torso, matching the reference images https://raw.githubusercontent.com/l0nw0lf/optimum-vault/main/src/game/bases/face.jpg and https://raw.githubusercontent.com/l0nw0lf/optimum-vault/main/src/game/bases/body.jpg";

export function buildPortraitPrompt(vibe: VibeId, seed: number): string {
  const rand = mulberry32(seed || 1);
  const pool = POOLS[vibe];
  return [
    `Character with ${BASE_APPEARANCE}, upper body portrait, torso and face visible, close crop, profile picture format`,
    `wearing ${pick(rand, pool.outfit)}`,
    pick(rand, pool.accent),
    pick(rand, pool.expression),
    `${pick(rand, pool.background)} background`,
    "keep the flame head, infinity mask, eye, and body structure identical to the reference",
  ].join(", ");
}
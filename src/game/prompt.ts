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

export function buildPortraitPrompt(vibe: VibeId, seed: number): { prompt: string; base: 0 | 1 } {
  const rand = mulberry32(seed || 1);
  const pool = POOLS[vibe];
  const base: 0 | 1 = rand() < 0.5 ? 0 : 1;
  const glyph = (seed >>> 0).toString(16).padStart(8, "0");
  const prompt = [
    "Edit the reference into a square portrait of this exact character.",
    "Identity lock: keep the cream flame-shaped head, the same peaks and gaps, the cream skin, the short neck, the body proportions, and the black leather mask identical to the reference. Do not redesign the face, mask, or flame silhouette. If the reference is a close crop, extend the same cream body. Do not swap mask styles between references.",
    `Outfit: ${pick(rand, pool.outfit)}.`,
    `Color accents: ${pick(rand, pool.accent)}.`,
    `Pose: ${pick(rand, pool.pose)}.`,
    `Expression, still using the same mask: ${pick(rand, pool.expression)}.`,
    `Background: ${pick(rand, pool.background)}.`,
    `Accessory on the outfit only: ${pick(rand, pool.accessory)}.`,
    "Disney-Pixar 3D animated style, soft studio light, one character only, centered, square portrait.",
    `Styling: ${pick(rand, ["warm key light", "cool rim light", "soft window light", "neon edge light"])}.`,
    "No text, no letters, no watermark, no logo, no extra people.",
    `Unique sitting ${glyph}.`,
  ].join(" ");
  return { prompt, base };
}
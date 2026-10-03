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

const FACE = [
  "an adult woman around thirty",
  "an adult man around thirty",
  "an androgynous adult around thirty",
  "an adult around thirty-five with striking bone structure",
  "an adult around thirty with a calm oval face",
] as const;

const SKIN = [
  "deep brown skin",
  "warm olive skin",
  "fair cool-toned skin",
  "golden tan skin",
  "rich ebony skin",
  "light brown skin",
] as const;

const HAIR = [
  "a sharp black undercut",
  "slicked charcoal hair",
  "loose dark waves tucked behind one ear",
  "a shaved side with longer top",
  "close-cropped natural hair",
  "a low knot of black hair",
  "silver-threaded dark hair swept back",
  "shoulder-length straight black hair",
] as const;

const DETAIL = [
  "a thin metallic ear cuff",
  "no jewelry",
  "a single small stud",
  "a narrow collar chain barely visible",
  "a faint scar through one eyebrow",
] as const;

const POOLS: Record<
  VibeId,
  {
    outfit: string[];
    accent: string[];
    pose: string[];
    expression: string[];
    background: string[];
  }
> = {
  flexnode: {
    outfit: [
      "cropped technical streetwear jacket over a black ribbed knit",
      "asymmetric nylon windbreaker in matte black",
      "layered charcoal hoodie with structured shoulders",
      "sleeveless tactical vest over a dark ribbed top",
      "oversized charcoal bomber with a high collar",
    ],
    accent: [
      "electric blue edge light along the jacket",
      "cobalt filament lines in the seams",
      "icy cyan rim light",
      "ultramarine specular highlights",
    ],
    pose: [
      "a mid-turn dynamic lean, weight on the back foot",
      "one shoulder pushed forward as if already moving",
      "chin slightly lifted, caught mid-motion",
      "a ready stance, torso angled off-axis",
    ],
    expression: [
      "a confident half-smirk",
      "a sharp knowing grin",
      "a cool unbothered stare",
      "a quiet dare in the eyes",
    ],
    background: [
      "a rain-slick urban night thrown far out of focus",
      "blurred city bokeh at blue hour",
      "a dark rooftop with distant cold lights",
      "a neon-reflected alley reduced to soft streaks",
      "a dim transit platform behind them",
    ],
  },
  validator: {
    outfit: [
      "a formal tactical coat, tailored and closed",
      "a black high-collar uniform jacket with precise seams",
      "a structured charcoal suit shell with a hidden placket",
      "a minimal armored dress shirt in matte black",
      "a silver-buttoned tactical overcoat",
    ],
    accent: [
      "silver and white edge accents",
      "cool white piping at the collar",
      "brushed-metal highlights",
      "pale ash rim light",
    ],
    pose: [
      "a calm composed stance, shoulders level",
      "hands relaxed at the sides, perfectly still",
      "a measured three-quarter stance",
      "upright and unhurried, weight evenly set",
    ],
    expression: [
      "a neutral focused expression",
      "a steady unreadable gaze",
      "quiet concentration, mouth relaxed",
      "an attentive, almost clinical calm",
    ],
    background: [
      "a clean minimal studio, charcoal seamless backdrop",
      "a dark soundstage with a single soft key light",
      "an empty ash-grey cyclorama",
      "a dim gallery wall, featureless and precise",
    ],
  },
  propagator: {
    outfit: [
      "explorer utility gear with strapped pockets",
      "a field jacket in matte black with webbing",
      "a lightweight traversal shell and dark base layer",
      "a hooded utility coat, half unzipped",
      "modular dark outdoor kit, worn in but clean",
    ],
    accent: [
      "teal edge lighting",
      "green-cyan filament along the straps",
      "sea-glass rim light",
      "muted emerald speculars",
    ],
    pose: [
      "a mid-stride walking pose, one foot still lifting",
      "turning as if following a signal down a corridor",
      "weight shifting forward, coat slightly in motion",
      "a pause mid-step, head angled toward something off-frame",
    ],
    expression: [
      "a curious open expression",
      "eyes narrowed with interest, not suspicion",
      "a faint questioning look",
      "alert, as if listening to a distant network",
    ],
    background: [
      "an expansive dark network-grid receding into haze",
      "faint orthogonal light lines like a city schematic",
      "a deep space of teal nodes and thin connections",
      "a blurred corridor of repeating luminous gridlines",
    ],
  },
  architect: {
    outfit: [
      "a sleek structured black coat with architectural shoulders",
      "a sharp tailored charcoal shell, almost geometric",
      "a column of matte black tailoring, no excess",
      "a high-collar constructed jacket with hard seams",
      "a precise dark uniform, cut like a building elevation",
    ],
    accent: [
      "gold and amber edge light",
      "warm brass highlights on the collar",
      "a thin amber rim along one shoulder",
      "low gold speculars, never bright yellow",
    ],
    pose: [
      "arms crossed, authoritative and still",
      "one arm folded, the other relaxed, chin level",
      "a squared stance like a facade",
      "hands clasped low, shoulders exact",
    ],
    expression: [
      "a sharp focused expression",
      "a composed, exacting gaze",
      "slightly narrowed eyes, nothing wasted",
      "a cool appraisal, mouth straight",
    ],
    background: [
      "a geometric architectural interior in charcoal and shadow",
      "hard planes of a dark atrium behind them",
      "repeating beams and a single warm slit of light",
      "a monumental concrete grid, softly out of focus",
    ],
  },
};

export function buildPortraitPrompt(vibe: VibeId, seed: number): string {
  const rand = mulberry32(seed || 1);
  const pool = POOLS[vibe];
  const person = [
    pick(rand, FACE),
    pick(rand, SKIN),
    pick(rand, HAIR),
    pick(rand, DETAIL),
  ].join(", ");
  const glyph = (seed >>> 0).toString(16).padStart(8, "0");

  return [
    "Tight head-and-shoulders portrait photograph, square, one person only, centered, eyes in the upper third.",
    `Subject: ${person}. Adult, fictional, not a celebrity, not a minor, not a public figure.`,
    `Outfit: ${pick(rand, pool.outfit)}.`,
    `Accent: ${pick(rand, pool.accent)}, kept subtle against black and charcoal.`,
    `Pose: ${pick(rand, pool.pose)}.`,
    `Expression: ${pick(rand, pool.expression)}.`,
    `Background: ${pick(rand, pool.background)}.`,
    "Shot on an 85mm lens, shallow depth of field, cinematic grade, fine grain, premium, photoreal.",
    "Palette is black, charcoal, and ash, with only the accent color as a controlled highlight.",
    "No text, no letters, no watermark, no logo, no border, no collage, no extra people, no extra limbs.",
    `Unique sitting ${glyph}.`,
  ].join(" ");
}

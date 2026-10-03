import type { VibeId } from "@/game/types";

const ACCENT: Record<VibeId, string> = {
  flexnode: "#6f97e8",
  validator: "#d5dde6",
  propagator: "#6eaea0",
  architect: "#c6a15a",
};

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

/** Local one-of-one mark used only if the image forge cannot be reached. */
export function makeSigil(vibe: VibeId, seed: number): string {
  const rand = mulberry32(seed || 1);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const g = canvas.getContext("2d");
  if (!g) return "";
  g.fillStyle = "#070708";
  g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = "rgba(183,201,230,0.35)";
  g.lineWidth = 2;
  g.strokeRect(72, 72, 880, 880);
  g.strokeStyle = ACCENT[vibe];
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(512, 470, 180 + rand() * 40, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  const sides = 5 + Math.floor(rand() * 4);
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + rand();
    const r = 90 + rand() * 220;
    const x = 512 + Math.cos(a) * r;
    const y = 470 + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.globalAlpha = 0.85;
  for (let i = 0; i < 18; i++) {
    g.beginPath();
    g.moveTo(160 + rand() * 700, 160 + rand() * 700);
    g.lineTo(160 + rand() * 700, 160 + rand() * 700);
    g.stroke();
  }
  return canvas.toDataURL("image/png");
}

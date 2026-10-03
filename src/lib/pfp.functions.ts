import { createServerFn } from "@tanstack/react-start";
import { buildPortraitPrompt } from "@/game/prompt";
import type { VibeId } from "@/game/types";

const VIBES: VibeId[] = ["flexnode", "validator", "propagator", "architect"];
const cache = new Map<string, string>();

function portraitUrl(prompt: string, seed: number): string {
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    seed: String(seed),
    nologo: "true",
    model: "turbo",
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
}

function timedOut(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function fetchPortrait(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "image/*" },
  });
  if (!res.ok) throw new Error(`Forge status ${res.status}`);
  const mime = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  if (!mime.startsWith("image/")) throw new Error("Forge did not return an image");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 800) throw new Error("Forge image was empty");
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export const forgePortrait = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Bad request");
    const vibe = (input as { vibe?: unknown }).vibe;
    const seed = (input as { seed?: unknown }).seed;
    if (typeof vibe !== "string" || !VIBES.includes(vibe as VibeId)) throw new Error("Unknown vibe");
    if (typeof seed !== "number" || !Number.isFinite(seed)) throw new Error("Bad seed");
    return { vibe: vibe as VibeId, seed: Math.floor(Math.abs(seed)) % 2147483647 };
  })
  .handler(async ({ data }) => {
    const key = `${data.vibe}:${data.seed}`;
    const cached = cache.get(key);
    if (cached) return { ok: true as const, image: cached };

    const prompt = buildPortraitPrompt(data.vibe, data.seed);
    try {
      const image = await fetchPortrait(portraitUrl(prompt, data.seed));
      cache.set(key, image);
      return { ok: true as const, image };
    } catch (error) {
      if (timedOut(error)) {
        return { ok: false as const, error: "The forge returned nothing this pass." };
      }
      return { ok: false as const, error: "The forge could not be reached." };
    }
  });

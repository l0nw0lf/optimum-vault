import { createServerFn } from "@tanstack/react-start";
import { buildPortraitPrompt } from "@/game/prompt";
import type { VibeId } from "@/game/types";

const VIBES: VibeId[] = ["flexnode", "validator", "propagator", "architect"];

const cache = new Map<string, string>();
const calls: number[] = [];

type ImagePayload = {
  data?: { b64_json?: string; url?: string; mime_type?: string }[];
};

function asDataUrl(raw: string, mime: string): string {
  if (raw.startsWith("data:")) return raw;
  return `data:${mime};base64,${raw}`;
}

function allowCall(): boolean {
  const now = Date.now();
  while (calls.length > 0 && now - (calls[0] ?? 0) > 10 * 60 * 1000) calls.shift();
  if (calls.length >= 8) return false;
  calls.push(now);
  return true;
}

async function requestImage(
  apiKey: string,
  model: string,
  prompt: string,
  rich: boolean,
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    response_format: "b64_json",
  };
  if (rich) {
    body.aspect_ratio = "1:1";
    body.resolution = "1k";
  }
  return fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55_000),
  });
}

async function imageFromResponse(res: Response): Promise<string | null> {
  if (!res.ok) return null;
  const payload = (await res.json()) as ImagePayload;
  const item = payload.data?.[0];
  if (!item) return null;
  if (item.b64_json) return asDataUrl(item.b64_json, item.mime_type || "image/jpeg");
  if (!item.url) return null;
  const img = await fetch(item.url, { signal: AbortSignal.timeout(20_000) });
  if (!img.ok) return null;
  const mime = img.headers.get("content-type")?.split(";")[0] || "image/png";
  const bytes = Buffer.from(await img.arrayBuffer());
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

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "The forge is offline in this environment." };
    if (!allowCall()) {
      return { ok: false as const, error: "The forge is cooling down. Try again in a few minutes." };
    }

    const prompt = buildPortraitPrompt(data.vibe, data.seed);
    try {
      let res = await requestImage(apiKey, "grok-imagine-image-2.0", prompt, true);
      if (!res.ok) {
        res = await requestImage(apiKey, "grok-imagine-image", prompt, false);
      }
      const image = await imageFromResponse(res);
      if (!image) return { ok: false as const, error: "The forge returned nothing this pass." };
      cache.set(key, image);
      return { ok: true as const, image };
    } catch {
      return { ok: false as const, error: "The forge could not be reached." };
    }
  });

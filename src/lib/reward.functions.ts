import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export const REWARD_IDS = [
  "1000302741",
  "1000302742",
  "1000302743",
  "1000302744",
  "1000302748",
  "1000302749",
  "1000302750",
  "1000302754",
  "1000302755",
  "1000302759",
] as const;

const LEDGER = path.join(process.cwd(), "data", "minted.json");

let chain: Promise<unknown> = Promise.resolve();

function lock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readFileClaims(): Promise<string[]> {
  try {
    const raw = await readFile(LEDGER, "utf8");
    const parsed = JSON.parse(raw) as { claimed?: unknown };
    if (!Array.isArray(parsed.claimed)) return [];
    return parsed.claimed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

async function readDbClaims(): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql<{ image_id: string }>`select image_id from reward_claims`;
  return rows.map((row) => row.image_id);
}

async function writeFileClaims(ids: string[]): Promise<void> {
  await mkdir(path.dirname(LEDGER), { recursive: true });
  const tmp = `${LEDGER}.tmp`;
  const unique = [...new Set(ids)].sort();
  await writeFile(tmp, `${JSON.stringify({ claimed: unique })}\n`);
  await rename(tmp, LEDGER);
}

async function drawOnce(): Promise<{ ok: true; image: string } | { ok: false; soldOut: true }> {
  for (let attempt = 0; attempt < REWARD_IDS.length; attempt += 1) {
    const claimed = new Set([...(await readFileClaims()), ...(await readDbClaims())]);
    const available = REWARD_IDS.filter((id) => !claimed.has(id));
    if (available.length === 0) return { ok: false, soldOut: true };

    const id = available[Math.floor(Math.random() * available.length)]!;
    const sql = await getSql();
    const inserted = await sql<{ image_id: string }>`
      insert into reward_claims (image_id)
      values (${id})
      on conflict (image_id) do nothing
      returning image_id
    `;
    if (inserted.length === 0) continue;

    claimed.add(id);
    try {
      await writeFileClaims([...claimed]);
    } catch {
      // The database row is the claim. A ledger write can fail on a read-only host.
    }
    return { ok: true, image: `/rewards/${id}.jpg` };
  }
  return { ok: false, soldOut: true };
}

export const claimReward = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Bad request");
    return {};
  })
  .handler(async () => {
    try {
      return await lock(() => drawOnce());
    } catch {
      return { ok: false as const, soldOut: false as const, error: "The drop could not be reached." };
    }
  });

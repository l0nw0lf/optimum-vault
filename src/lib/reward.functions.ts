import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";

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

const FILES = [
  path.join(process.cwd(), "data", "minted.json"),
  "/tmp/optimum-vault-minted.json",
];

const memory = globalThis as typeof globalThis & { __vaultMinted?: Set<string> };

function remembered(): Set<string> {
  memory.__vaultMinted ??= new Set();
  return memory.__vaultMinted;
}

let chain: Promise<unknown> = Promise.resolve();

function lock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readClaims(): Promise<Set<string>> {
  const ids = new Set(remembered());
  for (const file of FILES) {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8")) as { claimed?: unknown };
      if (!Array.isArray(parsed.claimed)) continue;
      for (const id of parsed.claimed) {
        if (typeof id === "string") ids.add(id);
      }
    } catch {
      // Missing or unreadable ledgers are an empty pool.
    }
  }
  return ids;
}

async function writeClaims(ids: Set<string>): Promise<void> {
  for (const id of ids) remembered().add(id);
  const body = `${JSON.stringify({ claimed: [...ids].sort() })}\n`;
  for (const file of FILES) {
    try {
      await mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      await writeFile(tmp, body);
      await rename(tmp, file);
    } catch {
      // One ledger path is enough. /tmp covers read-only project directories.
    }
  }
}

async function drawOnce(): Promise<{ ok: true; id: string; image: string } | { ok: false; soldOut: true }> {
  const claimed = await readClaims();
  const available = REWARD_IDS.filter((id) => !claimed.has(id));
  if (available.length === 0) return { ok: false, soldOut: true };
  const id = available[Math.floor(Math.random() * available.length)]!;
  claimed.add(id);
  await writeClaims(claimed);
  return { ok: true, id, image: `/rewards/${id}.jpg` };
}

export const claimReward = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async () => {
    try {
      return await lock(() => drawOnce());
    } catch (error) {
      console.error("[reward] claim failed", error);
      return { ok: false as const, soldOut: false as const, error: "The drop could not be reached." };
    }
  });

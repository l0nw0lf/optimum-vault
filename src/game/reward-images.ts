const modules = import.meta.glob("./rewards/*.jpg", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export const REWARD_SRC: Record<string, string> = {};
for (const [file, url] of Object.entries(modules)) {
  const id = file.split("/").pop()?.replace(/\.jpg$/, "");
  if (id && typeof url === "string") REWARD_SRC[id] = url;
}

export function rewardSrc(id: string): string {
  return REWARD_SRC[id] ?? `/rewards/${id}.jpg`;
}

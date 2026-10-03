import type { AnswerRec, Metrics, VibeId } from "@/game/types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function scoreVibe(metrics: Metrics, answers: AnswerRec[]): VibeId {
  const n = Math.max(1, answers.length);
  const accuracy = answers.filter((a) => a.correct).length / n;
  const avgSec = answers.reduce((sum, a) => sum + a.ms, 0) / n / 1000;
  const answerSpeed = clamp(1 - (avgSec - 2) / 18, 0, 1);
  const pace = clamp(1 - (metrics.exploreSeconds - 35) / 140, 0, 1);
  const speedNorm = clamp(metrics.avgSpeed / 3.4, 0, 1);
  const deliberate = clamp((avgSec - 3.5) / 10, 0, 1);

  const scores: Record<VibeId, number> = {
    flexnode: 0.42 * answerSpeed + 0.33 * pace + 0.15 * metrics.moveDuty + 0.1 * speedNorm,
    validator: 0.78 * accuracy + 0.22 * deliberate * accuracy,
    propagator: 0.72 * (metrics.fullRooms / 3) + 0.28 * metrics.zoneCoverage,
    architect:
      0.52 * metrics.directness + 0.28 * accuracy + 0.2 * (1 - metrics.zoneCoverage * 0.55),
  };

  const order: VibeId[] = ["validator", "architect", "propagator", "flexnode"];
  let best: VibeId = "flexnode";
  let bestScore = -1;
  for (const id of order) {
    const value = scores[id];
    if (value > bestScore + 0.015) {
      best = id;
      bestScore = value;
    }
  }
  return best;
}

export type VibeId = "flexnode" | "validator" | "propagator" | "architect";

export type RoomId = "living" | "gallery" | "study";

export type Pt = { x: number; z: number };

export type AnswerRec = { correct: boolean; ms: number };

export type Metrics = {
  moveDuty: number;
  avgSpeed: number;
  pathLength: number;
  directness: number;
  fullRooms: number;
  zoneCoverage: number;
  exploreSeconds: number;
};

export type Question = {
  id: number;
  prompt: string;
  choices: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
};

export const VIBE_COPY: Record<VibeId, { name: string; line: string }> = {
  flexnode: {
    name: "Flexnode",
    line: "You moved before the room finished speaking.",
  },
  validator: {
    name: "Validator",
    line: "You read every signal until it had nowhere to hide.",
  },
  propagator: {
    name: "Propagator",
    line: "You walked every corridor a signal could hide in.",
  },
  architect: {
    name: "Architect",
    line: "You took the line that was already there.",
  },
};

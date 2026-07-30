// STRYV — program generator (rule-based v1)
// Given onboarding answers, produce a weekly training program.

import type { OnboardingInput } from "./types";

export type GeneratedExercise = {
  name: string;
  sets: number;
  rep_range: string;
  target_rir: number;
  rest_seconds: number;
  notes?: string;
};

export type GeneratedDay = {
  day_index: number;
  name: string;
  muscle_groups: string[];
  is_rest: boolean;
  exercises: GeneratedExercise[];
};

export type GeneratedProgram = {
  name: string;
  split: string;
  days_per_week: number;
  goal: string;
  notes: string;
  days: GeneratedDay[];
};

const PUSH: GeneratedExercise[] = [
  { name: "Barbell Bench Press", sets: 4, rep_range: "6-8", target_rir: 2, rest_seconds: 150 },
  { name: "Incline Dumbbell Press", sets: 3, rep_range: "8-10", target_rir: 2, rest_seconds: 120 },
  { name: "Overhead Press", sets: 3, rep_range: "6-10", target_rir: 2, rest_seconds: 120 },
  { name: "Lateral Raise", sets: 3, rep_range: "12-15", target_rir: 1, rest_seconds: 60 },
  { name: "Triceps Pushdown", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 60 },
];

const PULL: GeneratedExercise[] = [
  { name: "Pull-Up", sets: 4, rep_range: "6-10", target_rir: 2, rest_seconds: 150 },
  { name: "Barbell Row", sets: 3, rep_range: "6-8", target_rir: 2, rest_seconds: 120 },
  { name: "Seated Cable Row", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 90 },
  { name: "Face Pull", sets: 3, rep_range: "12-15", target_rir: 1, rest_seconds: 60 },
  { name: "Barbell Curl", sets: 3, rep_range: "8-12", target_rir: 1, rest_seconds: 75 },
];

const LEGS: GeneratedExercise[] = [
  { name: "Barbell Back Squat", sets: 4, rep_range: "6-8", target_rir: 2, rest_seconds: 180 },
  { name: "Romanian Deadlift", sets: 3, rep_range: "8-10", target_rir: 2, rest_seconds: 150 },
  { name: "Leg Press", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 120 },
  { name: "Leg Curl", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 75 },
  { name: "Standing Calf Raise", sets: 4, rep_range: "10-15", target_rir: 1, rest_seconds: 60 },
];

const UPPER: GeneratedExercise[] = [
  { name: "Barbell Bench Press", sets: 4, rep_range: "6-8", target_rir: 2, rest_seconds: 150 },
  { name: "Barbell Row", sets: 4, rep_range: "6-8", target_rir: 2, rest_seconds: 150 },
  { name: "Overhead Press", sets: 3, rep_range: "8-10", target_rir: 2, rest_seconds: 120 },
  { name: "Pull-Up", sets: 3, rep_range: "6-10", target_rir: 2, rest_seconds: 120 },
  { name: "Lateral Raise", sets: 3, rep_range: "12-15", target_rir: 1, rest_seconds: 60 },
  { name: "Barbell Curl", sets: 3, rep_range: "8-12", target_rir: 1, rest_seconds: 60 },
];

const LOWER: GeneratedExercise[] = [
  { name: "Barbell Back Squat", sets: 4, rep_range: "6-8", target_rir: 2, rest_seconds: 180 },
  { name: "Romanian Deadlift", sets: 3, rep_range: "8-10", target_rir: 2, rest_seconds: 150 },
  { name: "Leg Press", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 120 },
  { name: "Leg Curl", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 75 },
  { name: "Standing Calf Raise", sets: 4, rep_range: "10-15", target_rir: 1, rest_seconds: 60 },
];

const FULLBODY: GeneratedExercise[] = [
  { name: "Barbell Back Squat", sets: 3, rep_range: "6-8", target_rir: 2, rest_seconds: 150 },
  { name: "Barbell Bench Press", sets: 3, rep_range: "6-8", target_rir: 2, rest_seconds: 150 },
  { name: "Barbell Row", sets: 3, rep_range: "6-10", target_rir: 2, rest_seconds: 120 },
  { name: "Romanian Deadlift", sets: 2, rep_range: "8-10", target_rir: 2, rest_seconds: 120 },
  { name: "Overhead Press", sets: 2, rep_range: "8-10", target_rir: 2, rest_seconds: 90 },
];

const ARMS: GeneratedExercise[] = [
  { name: "Barbell Curl", sets: 4, rep_range: "8-12", target_rir: 1, rest_seconds: 90 },
  { name: "Incline Dumbbell Curl", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 75 },
  { name: "Close-Grip Bench Press", sets: 4, rep_range: "6-10", target_rir: 2, rest_seconds: 120 },
  { name: "Overhead Cable Extension", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 75 },
  { name: "Hammer Curl", sets: 3, rep_range: "10-15", target_rir: 1, rest_seconds: 60 },
];

const CHEST: GeneratedExercise[] = [
  { name: "Barbell Bench Press", sets: 4, rep_range: "6-8", target_rir: 2, rest_seconds: 150 },
  { name: "Incline Dumbbell Press", sets: 4, rep_range: "8-10", target_rir: 2, rest_seconds: 120 },
  { name: "Chest Dip", sets: 3, rep_range: "8-12", target_rir: 2, rest_seconds: 90 },
  { name: "Cable Fly", sets: 3, rep_range: "12-15", target_rir: 1, rest_seconds: 60 },
];

const BACK: GeneratedExercise[] = [
  { name: "Pull-Up", sets: 4, rep_range: "6-10", target_rir: 2, rest_seconds: 150 },
  { name: "Barbell Row", sets: 4, rep_range: "6-8", target_rir: 2, rest_seconds: 150 },
  { name: "Seated Cable Row", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 90 },
  { name: "Lat Pulldown", sets: 3, rep_range: "10-12", target_rir: 1, rest_seconds: 75 },
];

const SHOULDERS: GeneratedExercise[] = [
  { name: "Overhead Press", sets: 4, rep_range: "6-8", target_rir: 2, rest_seconds: 150 },
  { name: "Seated Dumbbell Press", sets: 3, rep_range: "8-12", target_rir: 2, rest_seconds: 105 },
  { name: "Lateral Raise", sets: 4, rep_range: "12-15", target_rir: 1, rest_seconds: 60 },
  { name: "Face Pull", sets: 3, rep_range: "12-15", target_rir: 1, rest_seconds: 60 },
];

type DayTemplate = { name: string; muscles: string[]; ex: GeneratedExercise[] };

const T = {
  fullbody: (i: number): DayTemplate => ({
    name: `Full Body ${String.fromCharCode(65 + i)}`,
    muscles: ["Full Body"],
    ex: FULLBODY,
  }),
  upper: { name: "Upper", muscles: ["Chest", "Back", "Shoulders", "Arms"], ex: UPPER } as DayTemplate,
  lower: { name: "Lower", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"], ex: LOWER } as DayTemplate,
  push: { name: "Push", muscles: ["Chest", "Shoulders", "Triceps"], ex: PUSH } as DayTemplate,
  pull: { name: "Pull", muscles: ["Back", "Biceps"], ex: PULL } as DayTemplate,
  legs: { name: "Legs", muscles: ["Quads", "Hamstrings", "Glutes"], ex: LEGS } as DayTemplate,
  chest: { name: "Chest", muscles: ["Chest"], ex: CHEST } as DayTemplate,
  back: { name: "Back", muscles: ["Back"], ex: BACK } as DayTemplate,
  shoulders: { name: "Shoulders", muscles: ["Shoulders"], ex: SHOULDERS } as DayTemplate,
  arms: { name: "Arms", muscles: ["Biceps", "Triceps"], ex: ARMS } as DayTemplate,
};

function normalizeSplit(pref?: string | null): "fullbody" | "upperlower" | "ppl" | "bro" | null {
  const p = (pref ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (!p || p.includes("nopreference")) return null;
  if (p.includes("full")) return "fullbody";
  if (p.includes("upper")) return "upperlower";
  if (p.includes("push") || p === "ppl") return "ppl";
  if (p.includes("bro")) return "bro";
  return null;
}

function buildTemplate(kind: "fullbody" | "upperlower" | "ppl" | "bro", days: number) {
  if (kind === "fullbody") {
    return {
      split: "Full Body",
      template: Array.from({ length: days }, (_, i) => T.fullbody(i)),
    };
  }
  if (kind === "upperlower") {
    const cycle = [T.upper, T.lower];
    return {
      split: "Upper / Lower",
      template: Array.from({ length: days }, (_, i) => ({
        ...cycle[i % 2],
        name: `${cycle[i % 2].name} ${String.fromCharCode(65 + Math.floor(i / 2))}`,
      })),
    };
  }
  if (kind === "ppl") {
    const cycle = [T.push, T.pull, T.legs];
    return {
      split: "Push / Pull / Legs",
      template: Array.from({ length: days }, (_, i) => ({ ...cycle[i % 3] })),
    };
  }
  const cycle = [T.chest, T.back, T.legs, T.shoulders, T.arms, T.fullbody(0)];
  return {
    split: "Bro Split",
    template: Array.from({ length: days }, (_, i) => ({ ...cycle[i % cycle.length] })),
  };
}

export function generateProgram(o: OnboardingInput): GeneratedProgram {
  const days = Math.max(2, Math.min(6, o.days_per_week ?? 4));
  const pref = normalizeSplit(o.split_preference);

  // Honour the user's chosen split; otherwise pick one that fits their weekly frequency.
  const kind = pref ?? (days <= 3 ? "fullbody" : days === 4 ? "upperlower" : "ppl");
  const { split, template } = buildTemplate(kind, days);


  const generatedDays: GeneratedDay[] = template.map((d, i) => ({
    day_index: i,
    name: d.name,
    muscle_groups: d.muscles,
    is_rest: false,
    exercises: d.ex,
  }));

  return {
    name: `${split} — ${o.goal ?? "General"}`,
    split,
    days_per_week: days,
    goal: o.goal ?? "general",
    notes:
      "Progression: when all sets hit the top of the rep range at target RIR, add 2.5–5kg (upper) or 5–10kg (lower). Deload after 4–6 hard weeks or when performance drops for 2 sessions.",
    days: generatedDays,
  };
}

// STRV — program generator (rule-based v1)
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

export function generateProgram(o: OnboardingInput): GeneratedProgram {
  const days = Math.max(2, Math.min(6, o.days_per_week ?? 4));
  let split: string;
  let template: { name: string; muscles: string[]; ex: GeneratedExercise[] }[];

  if (days <= 3) {
    split = "Full Body";
    template = [
      { name: "Full Body A", muscles: ["Full Body"], ex: FULLBODY },
      { name: "Full Body B", muscles: ["Full Body"], ex: FULLBODY },
      { name: "Full Body C", muscles: ["Full Body"], ex: FULLBODY },
    ].slice(0, days);
  } else if (days === 4) {
    split = "Upper / Lower";
    template = [
      { name: "Upper A", muscles: ["Chest", "Back", "Shoulders", "Arms"], ex: UPPER },
      { name: "Lower A", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"], ex: LOWER },
      { name: "Upper B", muscles: ["Chest", "Back", "Shoulders", "Arms"], ex: UPPER },
      { name: "Lower B", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"], ex: LOWER },
    ];
  } else {
    split = "Push / Pull / Legs";
    template = [
      { name: "Push", muscles: ["Chest", "Shoulders", "Triceps"], ex: PUSH },
      { name: "Pull", muscles: ["Back", "Biceps"], ex: PULL },
      { name: "Legs", muscles: ["Quads", "Hamstrings", "Glutes"], ex: LEGS },
      { name: "Push", muscles: ["Chest", "Shoulders", "Triceps"], ex: PUSH },
      { name: "Pull", muscles: ["Back", "Biceps"], ex: PULL },
      { name: "Legs", muscles: ["Quads", "Hamstrings", "Glutes"], ex: LEGS },
    ].slice(0, days);
  }

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

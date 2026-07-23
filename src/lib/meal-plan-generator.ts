// STRV — meal plan generator (rule-based v1)
import type { OnboardingInput } from "./types";

export type MealSuggestion = {
  name: string;
  time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: string[];
};

export type GeneratedMealPlan = {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal: string;
  notes: string;
  meals: MealSuggestion[];
};

// Mifflin–St Jeor BMR
function bmr(weightKg: number, heightCm: number, age: number, sex: string) {
  const s = sex?.toLowerCase() === "female" ? -161 : 5;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

function activityMultiplier(level?: string | null) {
  switch ((level ?? "").toLowerCase()) {
    case "sedentary": return 1.3;
    case "light": return 1.45;
    case "moderate": return 1.6;
    case "very_active":
    case "very active":
    case "high": return 1.75;
    default: return 1.55;
  }
}

function ageFromRange(r?: string | null): number {
  if (!r) return 30;
  const nums = r.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return 30;
  if (nums.length === 1) return nums[0] + 3;
  return Math.round((nums[0] + nums[1]) / 2);
}

export function generateMealPlan(o: OnboardingInput): GeneratedMealPlan {
  const weight = o.weight_kg ?? 75;
  const height = o.height_cm ?? 175;
  const age = ageFromRange(o.age_range);
  const tdee = Math.round(bmr(weight, height, age, o.sex ?? "male") * activityMultiplier(o.activity_level));

  const goal = (o.goal ?? "general").toLowerCase();
  let calories = tdee;
  let proteinPerKg = 1.8;
  let fatPct = 0.28;

  if (goal.includes("fat") || goal.includes("cut") || goal.includes("loss")) {
    calories = Math.round(tdee - 500);
    proteinPerKg = 2.2;
    fatPct = 0.25;
  } else if (goal.includes("muscle") || goal.includes("gain") || goal.includes("bulk")) {
    calories = Math.round(tdee + 300);
    proteinPerKg = 2.0;
    fatPct = 0.25;
  } else if (goal.includes("recomp")) {
    calories = tdee - 150;
    proteinPerKg = 2.2;
    fatPct = 0.28;
  } else if (goal.includes("strength")) {
    calories = tdee + 150;
    proteinPerKg = 1.8;
    fatPct = 0.28;
  } else if (goal.includes("comp")) {
    calories = Math.round(tdee - 400);
    proteinPerKg = 2.4;
    fatPct = 0.22;
  }

  calories = Math.max(1400, calories);
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((calories * fatPct) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  const veg = o.dietary_preferences?.toLowerCase().includes("vegan") || o.dietary_preferences?.toLowerCase().includes("vegetarian");

  const meals: MealSuggestion[] = [
    {
      name: "Breakfast",
      time: "7:30 AM",
      calories: Math.round(calories * 0.25),
      protein_g: Math.round(protein * 0.25),
      carbs_g: Math.round(carbs * 0.3),
      fat_g: Math.round(fat * 0.2),
      items: veg
        ? ["Oats with berries & almond butter", "Soy yogurt", "Coffee"]
        : ["3 whole eggs + 2 whites", "Oats with berries", "Coffee"],
    },
    {
      name: "Lunch",
      time: "12:30 PM",
      calories: Math.round(calories * 0.3),
      protein_g: Math.round(protein * 0.3),
      carbs_g: Math.round(carbs * 0.3),
      fat_g: Math.round(fat * 0.3),
      items: veg
        ? ["Tofu & lentil bowl", "Rice", "Mixed greens & olive oil"]
        : ["Grilled chicken breast", "Rice", "Mixed greens & olive oil"],
    },
    {
      name: "Pre-workout Snack",
      time: "4:00 PM",
      calories: Math.round(calories * 0.1),
      protein_g: Math.round(protein * 0.1),
      carbs_g: Math.round(carbs * 0.15),
      fat_g: Math.round(fat * 0.05),
      items: ["Banana", "Whey / plant protein shake"],
    },
    {
      name: "Dinner",
      time: "7:30 PM",
      calories: Math.round(calories * 0.3),
      protein_g: Math.round(protein * 0.3),
      carbs_g: Math.round(carbs * 0.2),
      fat_g: Math.round(fat * 0.35),
      items: veg
        ? ["Tempeh stir-fry", "Sweet potato", "Broccoli & sesame oil"]
        : ["Salmon or lean beef", "Sweet potato", "Broccoli & olive oil"],
    },
    {
      name: "Evening Snack",
      time: "9:30 PM",
      calories: Math.round(calories * 0.05),
      protein_g: Math.round(protein * 0.05),
      carbs_g: Math.round(carbs * 0.05),
      fat_g: Math.round(fat * 0.1),
      items: veg ? ["Soy yogurt & walnuts"] : ["Greek yogurt & walnuts"],
    },
  ];

  return {
    daily_calories: calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    goal: o.goal ?? "general",
    notes:
      "Targets are a starting point based on Mifflin–St Jeor and your activity. Weigh in daily fasted and adjust calories by ~10% every 2 weeks based on the trend, not day-to-day.",
    meals,
  };
}

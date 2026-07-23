// STRV — comprehensive meal plan generator (rule-based v2)
// Ties calories/macros directly to the training goal and filters foods
// against dietary preference, allergies, sensitivities, and dislikes.
import type { OnboardingInput } from "./types";

export type MealSuggestion = {
  name: string;
  time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: string[];
  alternatives?: string[];
  purpose?: string;
};

export type GeneratedMealPlan = {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
  meals_per_day: number;
  goal: string;
  notes: string;
  excluded: string[];
  meals: MealSuggestion[];
};

// ---------- energy math ----------

function bmr(weightKg: number, heightCm: number, age: number, sex: string) {
  const s = sex?.toLowerCase() === "female" ? -161 : 5;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

function activityMultiplier(level?: string | null) {
  switch ((level ?? "").toLowerCase()) {
    case "sedentary": return 1.3;
    case "light":
    case "lightly_active": return 1.45;
    case "moderate":
    case "moderately_active": return 1.6;
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

// ---------- goal → targets ----------

type GoalTargets = {
  calorieDelta: number;    // vs TDEE
  proteinPerKg: number;
  fatPct: number;          // of total calories
  fiberPerKcal: number;    // g per kcal (14g / 1000 kcal baseline)
  waterMlPerKg: number;
  mealsPerDay: number;
  goalKey: string;
  rationale: string;
};

function targetsForGoal(goal: string, weightKg: number): GoalTargets {
  const g = (goal || "general").toLowerCase();
  if (g.includes("fat") || g.includes("cut") || g.includes("loss")) {
    return { calorieDelta: -Math.min(600, Math.round(weightKg * 7)), proteinPerKg: 2.3, fatPct: 0.25, fiberPerKcal: 0.016, waterMlPerKg: 40, mealsPerDay: 4, goalKey: "fat_loss",
      rationale: "Moderate deficit (~500 kcal) with high protein to preserve muscle while losing fat." };
  }
  if (g.includes("muscle") || g.includes("gain") || g.includes("bulk")) {
    return { calorieDelta: 300, proteinPerKg: 2.0, fatPct: 0.25, fiberPerKcal: 0.013, waterMlPerKg: 40, mealsPerDay: 5, goalKey: "muscle_gain",
      rationale: "Small surplus (~300 kcal) to fuel hypertrophy without excess fat gain." };
  }
  if (g.includes("recomp")) {
    return { calorieDelta: -150, proteinPerKg: 2.4, fatPct: 0.27, fiberPerKcal: 0.014, waterMlPerKg: 40, mealsPerDay: 4, goalKey: "recomposition",
      rationale: "Near-maintenance with very high protein — slow lean-mass gain while shedding fat." };
  }
  if (g.includes("strength")) {
    return { calorieDelta: 200, proteinPerKg: 1.8, fatPct: 0.28, fiberPerKcal: 0.013, waterMlPerKg: 40, mealsPerDay: 4, goalKey: "strength",
      rationale: "Small surplus, moderate protein — carbs drive performance on heavy days." };
  }
  if (g.includes("comp")) {
    return { calorieDelta: -500, proteinPerKg: 2.5, fatPct: 0.22, fiberPerKcal: 0.017, waterMlPerKg: 45, mealsPerDay: 5, goalKey: "competition_prep",
      rationale: "Aggressive but sustainable deficit with maximal protein for stage prep." };
  }
  return { calorieDelta: 0, proteinPerKg: 1.6, fatPct: 0.28, fiberPerKcal: 0.014, waterMlPerKg: 35, mealsPerDay: 3, goalKey: "general",
    rationale: "Maintenance with balanced macros for overall health and performance." };
}

// ---------- food library ----------

type FoodTag =
  | "meat" | "poultry" | "fish" | "shellfish" | "egg" | "dairy" | "whey"
  | "gluten" | "wheat" | "soy" | "peanut" | "treenut" | "sesame"
  | "vegan" | "vegetarian" | "pescetarian" | "keto" | "lowcarb"
  | "carb" | "fat" | "protein" | "veg" | "fruit" | "fodmap";

type Food = { name: string; tags: FoodTag[] };

const F = (name: string, ...tags: FoodTag[]): Food => ({ name, tags });

// Curated compact library — each item is a plate-friendly serving.
const PROTEINS: Food[] = [
  F("Grilled chicken breast", "meat", "poultry", "protein"),
  F("Turkey mince", "meat", "poultry", "protein"),
  F("Lean beef sirloin", "meat", "protein"),
  F("Salmon fillet", "fish", "protein", "pescetarian"),
  F("White fish (cod / haddock)", "fish", "protein", "pescetarian"),
  F("Shrimp", "shellfish", "protein", "pescetarian"),
  F("Whole eggs + whites", "egg", "protein", "vegetarian"),
  F("Greek yogurt", "dairy", "protein", "vegetarian"),
  F("Cottage cheese", "dairy", "protein", "vegetarian"),
  F("Whey protein shake", "dairy", "whey", "protein", "vegetarian"),
  F("Tofu", "soy", "protein", "vegetarian", "vegan"),
  F("Tempeh", "soy", "protein", "vegetarian", "vegan"),
  F("Seitan", "gluten", "wheat", "protein", "vegetarian", "vegan"),
  F("Lentils", "protein", "vegetarian", "vegan", "carb", "fodmap"),
  F("Chickpeas", "protein", "vegetarian", "vegan", "carb", "fodmap"),
  F("Edamame", "soy", "protein", "vegetarian", "vegan"),
  F("Pea-protein shake", "protein", "vegetarian", "vegan"),
];

const CARBS: Food[] = [
  F("Jasmine rice", "carb", "vegan", "vegetarian"),
  F("Basmati rice", "carb", "vegan", "vegetarian"),
  F("Sweet potato", "carb", "vegan", "vegetarian"),
  F("White potato", "carb", "vegan", "vegetarian"),
  F("Oats", "carb", "vegan", "vegetarian", "gluten", "fodmap"),
  F("Gluten-free oats", "carb", "vegan", "vegetarian"),
  F("Whole-grain pasta", "carb", "vegan", "vegetarian", "gluten", "wheat"),
  F("Rice noodles", "carb", "vegan", "vegetarian"),
  F("Quinoa", "carb", "vegan", "vegetarian", "protein"),
  F("Sourdough bread", "carb", "vegan", "vegetarian", "gluten", "wheat"),
  F("Corn tortillas", "carb", "vegan", "vegetarian"),
  F("Berries", "fruit", "vegan", "vegetarian", "carb"),
  F("Banana", "fruit", "vegan", "vegetarian", "carb"),
  F("Apple", "fruit", "vegan", "vegetarian", "carb"),
];

const FATS: Food[] = [
  F("Olive oil", "fat", "vegan", "vegetarian"),
  F("Avocado", "fat", "vegan", "vegetarian", "fodmap"),
  F("Almonds", "fat", "treenut", "vegan", "vegetarian"),
  F("Walnuts", "fat", "treenut", "vegan", "vegetarian"),
  F("Peanut butter", "fat", "peanut", "vegan", "vegetarian"),
  F("Almond butter", "fat", "treenut", "vegan", "vegetarian"),
  F("Tahini", "fat", "sesame", "vegan", "vegetarian"),
  F("Chia seeds", "fat", "vegan", "vegetarian"),
];

const VEG: Food[] = [
  F("Mixed greens", "veg", "vegan", "vegetarian"),
  F("Broccoli", "veg", "vegan", "vegetarian", "fodmap"),
  F("Spinach", "veg", "vegan", "vegetarian"),
  F("Roasted peppers", "veg", "vegan", "vegetarian"),
  F("Cucumber & tomato", "veg", "vegan", "vegetarian"),
  F("Zucchini", "veg", "vegan", "vegetarian"),
];

// ---------- filter rules ----------

const ALLERGY_TAGS: Record<string, FoodTag[]> = {
  peanuts: ["peanut"],
  "tree nuts": ["treenut"],
  nuts: ["treenut", "peanut"],
  dairy: ["dairy", "whey"],
  lactose: ["dairy", "whey"],
  eggs: ["egg"],
  soy: ["soy"],
  gluten: ["gluten", "wheat"],
  wheat: ["gluten", "wheat"],
  shellfish: ["shellfish"],
  fish: ["fish", "shellfish"],
  sesame: ["sesame"],
};

const DIET_EXCLUDES: Record<string, FoodTag[]> = {
  vegan: ["meat", "poultry", "fish", "shellfish", "egg", "dairy", "whey"],
  vegetarian: ["meat", "poultry", "fish", "shellfish"],
  pescetarian: ["meat", "poultry"],
  keto: ["carb", "fruit"],
  low_carb: [],
  halal: [],
  kosher: ["shellfish"],
  omnivore: [],
  "": [],
};

function excludedTags(o: OnboardingInput): { blocked: Set<FoodTag>; labels: string[] } {
  const blocked = new Set<FoodTag>();
  const labels: string[] = [];

  const diet = (o.diet_type ?? o.dietary_preferences ?? "").toLowerCase().trim();
  const dietKey = Object.keys(DIET_EXCLUDES).find((k) => diet.includes(k));
  if (dietKey && DIET_EXCLUDES[dietKey].length) {
    DIET_EXCLUDES[dietKey].forEach((t) => blocked.add(t));
    labels.push(`Diet: ${dietKey}`);
  }

  const allergies: string[] = [
    ...(o.allergies_list ?? []),
    ...((o.allergies ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean)),
  ];
  for (const a of allergies) {
    const key = Object.keys(ALLERGY_TAGS).find((k) => a.toLowerCase().includes(k));
    if (key) {
      ALLERGY_TAGS[key].forEach((t) => blocked.add(t));
      labels.push(`Allergy: ${a}`);
    } else if (a) {
      labels.push(`Avoid: ${a}`);
    }
  }

  for (const s of o.sensitivities_list ?? []) {
    const key = Object.keys(ALLERGY_TAGS).find((k) => s.toLowerCase().includes(k));
    if (key) {
      ALLERGY_TAGS[key].forEach((t) => blocked.add(t));
      labels.push(`Sensitive: ${s}`);
    } else {
      labels.push(`Sensitive: ${s}`);
    }
  }

  return { blocked, labels: Array.from(new Set(labels)) };
}

function safe(pool: Food[], blocked: Set<FoodTag>, dislikes: string[]): Food[] {
  const dl = dislikes.map((d) => d.toLowerCase().trim()).filter(Boolean);
  return pool.filter((f) => {
    if (f.tags.some((t) => blocked.has(t))) return false;
    if (dl.some((d) => f.name.toLowerCase().includes(d))) return false;
    return true;
  });
}

function pick(pool: Food[], seed: number, n: number): Food[] {
  if (pool.length === 0) return [];
  const out: Food[] = [];
  for (let i = 0; i < n; i++) out.push(pool[(seed + i) % pool.length]);
  return out;
}

// ---------- meal assembly ----------

type Slot = { name: string; time: string; kcalPct: number; pPct: number; cPct: number; fPct: number; purpose: string };

function slotsFor(mealsPerDay: number, goalKey: string): Slot[] {
  const preWorkout = goalKey === "muscle_gain" || goalKey === "strength" || goalKey === "competition_prep";
  if (mealsPerDay >= 5) {
    return [
      { name: "Breakfast",        time: "7:30 AM",  kcalPct: 0.22, pPct: 0.22, cPct: 0.22, fPct: 0.22, purpose: "Kick off protein synthesis and glycogen." },
      { name: "Mid-morning",      time: "10:30 AM", kcalPct: 0.15, pPct: 0.18, cPct: 0.15, fPct: 0.10, purpose: "Steady protein feed between meals." },
      { name: "Lunch",            time: "1:00 PM",  kcalPct: 0.25, pPct: 0.25, cPct: 0.25, fPct: 0.28, purpose: "Main energy meal for the afternoon." },
      { name: preWorkout ? "Pre-workout" : "Afternoon snack", time: "4:30 PM", kcalPct: 0.13, pPct: 0.12, cPct: 0.20, fPct: 0.05, purpose: preWorkout ? "Fast carbs + protein 60–90 min before training." : "Bridge to dinner without overshooting." },
      { name: "Dinner",           time: "8:00 PM",  kcalPct: 0.25, pPct: 0.23, cPct: 0.18, fPct: 0.35, purpose: "Recovery meal: protein + veg + healthy fats." },
    ];
  }
  if (mealsPerDay === 4) {
    return [
      { name: "Breakfast", time: "7:30 AM", kcalPct: 0.25, pPct: 0.25, cPct: 0.25, fPct: 0.25, purpose: "Break the fast with protein + slow carbs." },
      { name: "Lunch",     time: "12:30 PM", kcalPct: 0.30, pPct: 0.30, cPct: 0.30, fPct: 0.30, purpose: "Biggest performance meal of the day." },
      { name: preWorkout ? "Pre-workout" : "Snack", time: "4:00 PM", kcalPct: 0.15, pPct: 0.15, cPct: 0.20, fPct: 0.05, purpose: preWorkout ? "Fuel training with easy carbs + protein." : "Prevent late-day hunger crash." },
      { name: "Dinner",    time: "7:30 PM", kcalPct: 0.30, pPct: 0.30, cPct: 0.25, fPct: 0.40, purpose: "Recovery + satiety before bed." },
    ];
  }
  return [
    { name: "Breakfast", time: "8:00 AM",  kcalPct: 0.30, pPct: 0.30, cPct: 0.30, fPct: 0.30, purpose: "Anchor meal with high protein." },
    { name: "Lunch",     time: "1:00 PM",  kcalPct: 0.35, pPct: 0.35, cPct: 0.35, fPct: 0.35, purpose: "Main energy meal." },
    { name: "Dinner",    time: "7:30 PM",  kcalPct: 0.35, pPct: 0.35, cPct: 0.35, fPct: 0.35, purpose: "Recovery + satiety." },
  ];
}

// ---------- public generator ----------

export function generateMealPlan(o: OnboardingInput): GeneratedMealPlan {
  const weight = o.weight_kg ?? 75;
  const height = o.height_cm ?? 175;
  const age = ageFromRange(o.age_range);
  const tdee = Math.round(bmr(weight, height, age, o.sex ?? "male") * activityMultiplier(o.activity_level));

  const t = targetsForGoal(o.goal ?? "general", weight);
  const calories = Math.max(1400, tdee + t.calorieDelta);
  const protein = Math.round(weight * t.proteinPerKg);
  const fat = Math.round((calories * t.fatPct) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round(calories * t.fiberPerKcal);
  const water = Math.round(weight * t.waterMlPerKg);

  const { blocked, labels } = excludedTags(o);
  const dislikes = o.disliked_foods ?? [];
  const proteins = safe(PROTEINS, blocked, dislikes);
  const carbsPool = safe(CARBS, blocked, dislikes);
  const fatsPool = safe(FATS, blocked, dislikes);
  const vegPool = safe(VEG, blocked, dislikes);

  const slots = slotsFor(t.mealsPerDay, t.goalKey);

  const meals: MealSuggestion[] = slots.map((s, i) => {
    const p = proteins.length ? proteins[i % proteins.length] : F("Protein shake", "protein");
    const c = carbsPool.length ? carbsPool[i % carbsPool.length] : F("Rice", "carb");
    const fatFood = fatsPool.length ? fatsPool[i % fatsPool.length] : F("Olive oil", "fat");
    const v = vegPool.length ? vegPool[i % vegPool.length] : F("Mixed greens", "veg");
    const isSnack = /snack|pre-workout|mid-morning/i.test(s.name);

    const items = isSnack
      ? [p.name, c.name]
      : [p.name, c.name, `${v.name} with ${fatFood.name}`];

    const altP = pick(proteins.filter((x) => x.name !== p.name), i + 1, 2).map((x) => x.name);
    const altC = pick(carbsPool.filter((x) => x.name !== c.name), i + 2, 2).map((x) => x.name);
    const alternatives = [
      altP.length ? `Swap protein → ${altP.join(" / ")}` : "",
      altC.length ? `Swap carb → ${altC.join(" / ")}` : "",
    ].filter(Boolean);

    return {
      name: s.name,
      time: s.time,
      calories: Math.round(calories * s.kcalPct),
      protein_g: Math.round(protein * s.pPct),
      carbs_g: Math.round(carbs * s.cPct),
      fat_g: Math.round(fat * s.fPct),
      items,
      alternatives,
      purpose: s.purpose,
    };
  });

  const notes = [
    t.rationale,
    `Targets from Mifflin–St Jeor × activity, tuned for your goal (${t.goalKey.replace(/_/g, " ")}).`,
    "Weigh in fasted 3–5× per week. Adjust calories ~10% every 2 weeks based on the trend, not day-to-day.",
    labels.length ? `Foods excluded from suggestions: ${labels.join("; ")}.` : "No dietary exclusions applied.",
  ].join(" ");

  return {
    daily_calories: calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fiber_g: fiber,
    water_ml: water,
    meals_per_day: t.mealsPerDay,
    goal: t.goalKey,
    notes,
    excluded: labels,
    meals,
  };
}

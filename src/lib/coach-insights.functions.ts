import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Verdict = "too_easy" | "on_target" | "too_hard";

type Insert = {
  user_id: string;
  kind: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warn" | "alert";
  ref_type?: string | null;
  ref_id?: string | null;
};

/**
 * Analyze the most recent completed workout and today's nutrition adherence,
 * and post short coach notifications for the user. Idempotent per (user, kind, ref_id).
 */
export const generateCoachInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const toInsert: Insert[] = [];

    // 1) Last completed workout — intensity verdict
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id, date, difficulty, performance, coach_verdict, program_day_id, logged_sets(exercise_name, weight, reps, rir), program_days(program_exercises(exercise_name, rep_range, target_rir, sets))")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session && !session.coach_verdict) {
      const sets = (session.logged_sets ?? []) as Array<{ exercise_name: string; weight: number | null; reps: number | null; rir: number | null }>;
      const prescribed = (session.program_days?.program_exercises ?? []) as Array<{ exercise_name: string; rep_range: string | null; target_rir: number | null; sets: number }>;
      const analysis = assessIntensity(sets, prescribed, session.difficulty);
      await supabase
        .from("workout_sessions")
        .update({ coach_verdict: analysis.verdict, coach_analysis: analysis.body })
        .eq("id", session.id);
      toInsert.push({
        user_id: userId,
        kind: "workout_intensity",
        ref_type: "workout_session",
        ref_id: session.id,
        title: analysis.title,
        body: analysis.body,
        severity: analysis.severity,
      });
    }

    // 2) Today's nutrition vs targets
    const [{ data: mealPlan }, { data: foods }] = await Promise.all([
      supabase.from("meal_plans").select("daily_calories, protein_g").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("food_logs").select("calories, protein_g, servings").eq("user_id", userId).eq("date", today),
    ]);

    if (mealPlan && Array.isArray(foods)) {
      const kcal = foods.reduce((s, f) => s + Number(f.calories ?? 0) * Number(f.servings ?? 1), 0);
      const protein = foods.reduce((s, f) => s + Number(f.protein_g ?? 0) * Number(f.servings ?? 1), 0);
      const kcalTarget = Number(mealPlan.daily_calories ?? 0);
      const proteinTarget = Number(mealPlan.protein_g ?? 0);
      const nowHour = new Date().getHours();

      if (kcalTarget > 0 && nowHour >= 20 && kcal < kcalTarget * 0.75) {
        toInsert.push({
          user_id: userId,
          kind: "nutrition_undereating",
          ref_id: `${today}-under`,
          title: "You're behind on calories today",
          body: `You've logged ~${Math.round(kcal)} kcal vs a ${Math.round(kcalTarget)} kcal target. Add a protein-forward snack before bed to protect recovery.`,
          severity: "warn",
        });
      }
      if (proteinTarget > 0 && nowHour >= 18 && protein < proteinTarget * 0.7) {
        toInsert.push({
          user_id: userId,
          kind: "nutrition_protein",
          ref_id: `${today}-protein`,
          title: "Protein low today",
          body: `${Math.round(protein)}g logged vs ${Math.round(proteinTarget)}g target. A 30–40g protein serving now (whey, Greek yogurt, chicken) closes the gap.`,
          severity: "warn",
        });
      }
      if (kcalTarget > 0 && kcal > kcalTarget * 1.15) {
        toInsert.push({
          user_id: userId,
          kind: "nutrition_overeating",
          ref_id: `${today}-over`,
          title: "Over your calorie target",
          body: `~${Math.round(kcal)} kcal logged vs ${Math.round(kcalTarget)} target. Not a problem for one day — keep tomorrow tight.`,
          severity: "info",
        });
      }
    }

    // 3) Missed daily check-in reminder (only if it's afternoon)
    if (new Date().getHours() >= 12) {
      const { data: daily } = await supabase.from("daily_checkins").select("id").eq("user_id", userId).eq("date", today).maybeSingle();
      if (!daily) {
        toInsert.push({
          user_id: userId,
          kind: "daily_checkin_reminder",
          ref_id: today,
          title: "Log today's weigh-in",
          body: "Consistent fasted weigh-ins let me spot real trends. Takes 15 seconds.",
          severity: "info",
        });
      }
    }

    if (toInsert.length) {
      await supabase.from("coach_notifications").upsert(toInsert, { onConflict: "user_id,kind,ref_id", ignoreDuplicates: true });
    }

    const { data: current } = await supabase
      .from("coach_notifications")
      .select("id, kind, title, body, severity, ref_type, ref_id, read_at, created_at")
      .eq("user_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    return { notifications: current ?? [] };
  });

function assessIntensity(
  sets: Array<{ exercise_name: string; weight: number | null; reps: number | null; rir: number | null }>,
  prescribed: Array<{ exercise_name: string; rep_range: string | null; target_rir: number | null; sets: number }>,
  difficulty: number | null,
): { verdict: Verdict; title: string; body: string; severity: "info" | "success" | "warn" | "alert" } {
  if (!sets.length) {
    return { verdict: "on_target", title: "Session logged", body: "No set data to analyze — try logging weight, reps, and RIR next time so I can grade the intensity.", severity: "info" };
  }
  const rirs = sets.map((s) => s.rir).filter((v): v is number => v != null);
  const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const prescribedMap = new Map(prescribed.map((p) => [p.exercise_name, p]));

  let hitTop = 0, missedLow = 0, counted = 0;
  for (const s of sets) {
    const p = prescribedMap.get(s.exercise_name);
    if (!p?.rep_range || s.reps == null) continue;
    const [lo, hi] = p.rep_range.split("-").map((n) => parseInt(n, 10));
    if (isNaN(lo) || isNaN(hi)) continue;
    counted++;
    if (s.reps >= hi) hitTop++;
    if (s.reps < lo) missedLow++;
  }

  const topRate = counted ? hitTop / counted : 0;
  const missRate = counted ? missedLow / counted : 0;

  // Too easy: avg RIR > target+1.5 (target usually ~2), difficulty low, or almost every set hit top of range
  if ((avgRir != null && avgRir >= 3.5) || (topRate >= 0.8 && (difficulty ?? 3) <= 3)) {
    return {
      verdict: "too_easy",
      severity: "warn",
      title: "That was too easy",
      body: `Avg RIR ${avgRir?.toFixed(1) ?? "-"}${counted ? ` · ${hitTop}/${counted} sets hit top of range` : ""}. Bump the load 2.5–5% next session and aim for RIR 1–2 on working sets.`,
    };
  }
  // Too hard: many sets missing bottom of rep range or difficulty 5 with low performance
  if (missRate >= 0.4 || (difficulty === 5 && (avgRir ?? 0) <= 0)) {
    return {
      verdict: "too_hard",
      severity: "alert",
      title: "That may have been too hard",
      body: `${missedLow}/${counted} sets fell short of the rep range. Hold the load next session, focus on clean reps, and make sure sleep/food are dialed.`,
    };
  }
  return {
    verdict: "on_target",
    severity: "success",
    title: "Solid session — right in the pocket",
    body: `Avg RIR ${avgRir?.toFixed(1) ?? "-"}. Progression looks appropriate. Next session try to add a rep on your top sets before adding weight.`,
  };
}

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { id: string };
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("coach_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

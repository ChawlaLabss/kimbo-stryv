import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getPersona } from "./coach-personas";

const Input = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

export const chatWithCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { conversationId, message } = data;

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId, user_id: userId, role: "user", content: message,
    });

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const threeDaysAgo = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10);

    const [onb, program, recent, sources, history, profile, mealPlan, foodLogs, dailyCheckins, weekly] = await Promise.all([
      supabase.from("onboarding_responses").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("training_programs").select("name, split, days_per_week, goal, notes, program_days(name, muscle_groups, program_exercises(exercise_name, sets, rep_range, target_rir))").eq("user_id", userId).eq("active", true).maybeSingle(),
      supabase.from("workout_sessions").select("date, difficulty, energy, performance, soreness_notes, coach_verdict, logged_sets(weight, reps, rir, exercise_name)").eq("user_id", userId).eq("completed", true).order("date", { ascending: false }).limit(3),
      supabase.from("knowledge_sources").select("title, author, category, summary").eq("active", true).limit(6),
      supabase.from("ai_messages").select("role, content").eq("conversation_id", conversationId).order("created_at").limit(20),
      supabase.from("profiles").select("coach_persona").eq("id", userId).maybeSingle(),
      supabase.from("meal_plans").select("daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, goal").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("food_logs").select("date, meal_type, name, calories, protein_g, carbs_g, fat_g, servings").eq("user_id", userId).gte("date", threeDaysAgo).order("date", { ascending: false }),
      supabase.from("daily_checkins").select("date, weight_kg, mood, fasted, note").eq("user_id", userId).gte("date", weekAgo).order("date", { ascending: false }),
      supabase.from("weekly_checkins").select("week_start, body_weight_kg, meal_accuracy, water_accuracy, steps_completed, hunger, digestion, biggest_win, biggest_challenge, sleep_quality, stress_level, motivation, energy, soreness").eq("user_id", userId).order("week_start", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const persona = getPersona((profile.data as { coach_persona?: string } | null)?.coach_persona);

    const systemContext = buildSystemPrompt({
      onboarding: onb.data,
      program: program.data,
      recentSessions: recent.data,
      sources: sources.data ?? [],
      personaStyle: persona.style,
      personaName: persona.name,
      mealPlan: mealPlan.data,
      foodLogs: foodLogs.data ?? [],
      dailyCheckins: dailyCheckins.data ?? [],
      weeklyCheckin: weekly.data,
      today,
    });

    const messages = [
      { role: "system" as const, content: systemContext },
      ...(history.data ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string })),
    ];

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI coach is not configured yet.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "google/gemini-3.5-flash", messages }),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Coach is rate limited. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`AI gateway error: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    const reply = json.choices[0]?.message?.content ?? "I couldn't produce a response. Try again.";

    const citations = (sources.data ?? []).slice(0, 2).map((s) => ({ source: [s.title, s.author].filter(Boolean).join(" — ") }));

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId, user_id: userId, role: "assistant", content: reply, sources: citations,
    });

    return { reply, citations };
  });

type OnbRow = {
  goal: string | null; experience: string | null; days_per_week: number | null;
  injuries: string | null; avoid_exercises: string | null; equipment: string[] | null;
  priority_muscles: string[] | null; weight_kg: number | null; target_weight_kg: number | null;
};

function buildSystemPrompt(ctx: {
  onboarding: OnbRow | null;
  program: {
    name: string; split: string | null; days_per_week: number | null; goal: string | null; notes: string | null;
    program_days: Array<{ name: string; muscle_groups: string[] | null; program_exercises: Array<{ exercise_name: string; sets: number; rep_range: string | null; target_rir: number | null }> }>;
  } | null;
  recentSessions: Array<{ date: string; difficulty: number | null; energy: number | null; performance: number | null; soreness_notes: string | null; coach_verdict: string | null; logged_sets: Array<{ weight: number | null; reps: number | null; rir: number | null; exercise_name: string }> }> | null;
  sources: Array<{ title: string; author: string | null; category: string | null; summary: string | null }>;
  personaStyle: string;
  personaName: string;
  mealPlan: { daily_calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null; water_ml: number | null; goal: string | null } | null;
  foodLogs: Array<{ date: string; meal_type: string | null; name: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; servings?: number | null }>;
  dailyCheckins: Array<{ date: string; weight_kg: number | null; mood: number | null; fasted: boolean | null; note: string | null }>;
  weeklyCheckin: { week_start: string; body_weight_kg: number | null; meal_accuracy: number | null; water_accuracy: number | null; steps_completed: number | null; hunger: number | null; digestion: number | null; biggest_win: string | null; biggest_challenge: string | null; sleep_quality: number | null; stress_level: number | null; motivation: number | null; energy: number | null; soreness: number | null } | null;
  today: string;
}): string {
  const parts: string[] = [];
  parts.push(
    `You are the STRV AI bodybuilding coach playing the character "${ctx.personaName}". You give practical, honest, evidence-based training AND nutrition guidance grounded in exercise-science literature.`,
    `PERSONA STYLE: ${ctx.personaStyle}`,
    `TODAY: ${ctx.today}`,
    "Rules (persona style does NOT override these):",
    "- Prioritize the user's approved knowledge base when relevant. Never invent citations.",
    "- Reference their ACTUAL metrics: workouts logged, food eaten vs targets, weight trend, check-in scores.",
    "- Assess workout intensity from logged RIR/reps vs prescribed ranges. If most sets ended >2 RIR from target, call it too easy; if <0 RIR (grinding failure) with dropping performance, call it too hard.",
    "- Assess nutrition: compare logged food totals to meal plan targets and comment on adherence.",
    "- Never recommend training through sharp pain. No medical diagnoses. No PED protocols. No shame-based language.",
    "- Be concrete: exercises, sets, reps, RIR, grams, calories.",
    "- Keep replies focused. Short paragraphs and lists.",
  );

  if (ctx.onboarding) {
    const o = ctx.onboarding;
    parts.push(`\nUSER PROFILE:\n- Goal: ${o.goal ?? "n/a"} · Experience: ${o.experience ?? "n/a"} · Days/wk: ${o.days_per_week ?? "n/a"}\n- Weight: ${o.weight_kg ?? "?"}kg → target ${o.target_weight_kg ?? "?"}kg\n- Priority muscles: ${(o.priority_muscles ?? []).join(", ") || "none"}\n- Equipment: ${(o.equipment ?? []).join(", ") || "n/a"}\n- Injuries: ${o.injuries || "none"} · Avoid: ${o.avoid_exercises || "none"}`);
  }
  if (ctx.program) {
    const p = ctx.program;
    const days = p.program_days.map((d) => `  · ${d.name} (${(d.muscle_groups ?? []).join("/")}): ${d.program_exercises.map((e) => `${e.exercise_name} ${e.sets}x${e.rep_range ?? "-"}@RIR${e.target_rir ?? "-"}`).join(" | ")}`).join("\n");
    parts.push(`\nCURRENT PROGRAM: ${p.name} — ${p.split ?? ""} (${p.days_per_week}d/wk)\n${days}\nProgression: ${p.notes ?? ""}`);
  }
  if (ctx.recentSessions?.length) {
    parts.push("\nRECENT SESSIONS (last 3):");
    ctx.recentSessions.forEach((s) => {
      const lifts = s.logged_sets.slice(0, 8).map((l) => `${l.exercise_name}: ${l.weight}kg x${l.reps} @RIR${l.rir ?? "-"}`).join("; ");
      parts.push(`- ${s.date} · diff ${s.difficulty}/5 · energy ${s.energy}/5 · perf ${s.performance}/5${s.coach_verdict ? ` · verdict:${s.coach_verdict}` : ""} · ${lifts}`);
    });
  }
  if (ctx.mealPlan) {
    const m = ctx.mealPlan;
    parts.push(`\nMEAL PLAN TARGETS (${m.goal ?? "goal"}): ${m.daily_calories ?? "?"}kcal · P${m.protein_g ?? "?"}g / C${m.carbs_g ?? "?"}g / F${m.fat_g ?? "?"}g · fiber ${m.fiber_g ?? "?"}g · water ${m.water_ml ?? "?"}ml`);
  }
  if (ctx.foodLogs.length) {
    const byDate: Record<string, { kcal: number; p: number; c: number; f: number; items: string[] }> = {};
    for (const l of ctx.foodLogs) {
      const d = (byDate[l.date] ||= { kcal: 0, p: 0, c: 0, f: 0, items: [] });
      d.kcal += l.calories ?? 0; d.p += l.protein_g ?? 0; d.c += l.carbs_g ?? 0; d.f += l.fat_g ?? 0;
      if (d.items.length < 5) d.items.push(l.food_name);
    }
    parts.push("\nFOOD LOG (last 3 days):");
    Object.entries(byDate).slice(0, 3).forEach(([d, v]) => {
      parts.push(`- ${d}: ${Math.round(v.kcal)}kcal · P${Math.round(v.p)} C${Math.round(v.c)} F${Math.round(v.f)} — ${v.items.join(", ")}`);
    });
  } else {
    parts.push("\nFOOD LOG: nothing logged in the last 3 days.");
  }
  if (ctx.dailyCheckins.length) {
    parts.push("\nDAILY CHECK-INS (last 7):");
    ctx.dailyCheckins.slice(0, 7).forEach((c) => {
      parts.push(`- ${c.date}: ${c.weight_kg ?? "?"}kg${c.fasted ? " (fasted)" : ""} · mood ${c.mood ?? "-"}/5 · energy ${c.energy ?? "-"}/5 · sleep ${c.sleep_hours ?? "-"}h`);
    });
  }
  if (ctx.weeklyCheckin) {
    const w = ctx.weeklyCheckin;
    parts.push(`\nLATEST WEEKLY CHECK-IN (${w.week_start}): weight ${w.body_weight_kg ?? "?"}kg · meal accuracy ${w.meal_accuracy ?? "?"}% · water ${w.water_accuracy ?? "?"}% · steps ${w.steps_avg ?? "?"} · hunger ${w.hunger ?? "?"}/5 · digestion ${w.digestion ?? "?"} · sleep ${w.sleep ?? "?"}/5 · stress ${w.stress ?? "?"}/5 · motivation ${w.motivation ?? "?"}/5 · win: ${w.biggest_win ?? "-"} · challenge: ${w.biggest_challenge ?? "-"}`);
  }
  if (ctx.sources.length) {
    parts.push("\nAPPROVED KNOWLEDGE BASE (cite only these):");
    ctx.sources.forEach((s) => parts.push(`- "${s.title}"${s.author ? ` by ${s.author}` : ""}${s.category ? ` [${s.category}]` : ""}${s.summary ? ` — ${s.summary}` : ""}`));
  }

  return parts.join("\n");
}

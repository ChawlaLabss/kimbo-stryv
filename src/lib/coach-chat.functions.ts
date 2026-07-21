import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

    const [onb, program, recent, sources, history] = await Promise.all([
      supabase.from("onboarding_responses").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("training_programs").select("name, split, days_per_week, goal, notes, program_days(name, muscle_groups, program_exercises(exercise_name, sets, rep_range, target_rir))").eq("user_id", userId).eq("active", true).maybeSingle(),
      supabase.from("workout_sessions").select("date, difficulty, energy, performance, soreness_notes, logged_sets(weight, reps, rir, exercise_name)").eq("user_id", userId).eq("completed", true).order("date", { ascending: false }).limit(3),
      supabase.from("knowledge_sources").select("title, author, category, summary").eq("active", true).limit(6),
      supabase.from("ai_messages").select("role, content").eq("conversation_id", conversationId).order("created_at").limit(20),
    ]);

    const systemContext = buildSystemPrompt({
      onboarding: onb.data,
      program: program.data,
      recentSessions: recent.data,
      sources: sources.data ?? [],
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
  recentSessions: Array<{ date: string; difficulty: number | null; energy: number | null; performance: number | null; soreness_notes: string | null; logged_sets: Array<{ weight: number | null; reps: number | null; rir: number | null; exercise_name: string }> }> | null;
  sources: Array<{ title: string; author: string | null; category: string | null; summary: string | null }>;
}): string {
  const parts: string[] = [];
  parts.push(
    "You are the STRV AI bodybuilding coach. You give practical, honest, evidence-based training guidance grounded in exercise-science literature.",
    "Rules:",
    "- Prioritize the user's approved knowledge base when relevant. Never invent citations or claim a source says something it does not.",
    "- Clearly distinguish (1) guidance supported by uploaded literature, (2) general training guidance, (3) situations requiring a qualified physician, physio, dietitian, or in-person coach.",
    "- Never recommend training through sharp pain. Suggest stopping/substituting and seeking medical help when warranted.",
    "- Do not diagnose injuries, eating disorders, hormonal or medical conditions. No steroid/PED protocols.",
    "- Reference the user's actual program and recent performance. Be concrete: exercises, sets, reps, RIR.",
    "- Keep replies focused. Prefer short paragraphs and lists.",
  );

  if (ctx.onboarding) {
    const o = ctx.onboarding;
    parts.push(`\nUSER PROFILE:\n- Goal: ${o.goal ?? "n/a"} · Experience: ${o.experience ?? "n/a"} · Days/wk: ${o.days_per_week ?? "n/a"}\n- Weight: ${o.weight_kg ?? "?"}kg → target ${o.target_weight_kg ?? "?"}kg\n- Priority muscles: ${(o.priority_muscles ?? []).join(", ") || "none"}\n- Equipment: ${(o.equipment ?? []).join(", ") || "n/a"}\n- Injuries: ${o.injuries || "none reported"} · Avoid: ${o.avoid_exercises || "none"}`);
  }
  if (ctx.program) {
    const p = ctx.program;
    const days = p.program_days.map((d) => `  · ${d.name} (${(d.muscle_groups ?? []).join("/")}): ${d.program_exercises.map((e) => `${e.exercise_name} ${e.sets}x${e.rep_range ?? "-"}@RIR${e.target_rir ?? "-"}`).join(" | ")}`).join("\n");
    parts.push(`\nCURRENT PROGRAM: ${p.name} — ${p.split ?? ""} (${p.days_per_week}d/wk)\n${days}\nProgression: ${p.notes ?? ""}`);
  }
  if (ctx.recentSessions?.length) {
    parts.push("\nRECENT SESSIONS:");
    ctx.recentSessions.forEach((s) => {
      const lifts = s.logged_sets.slice(0, 6).map((l) => `${l.exercise_name}: ${l.weight}kg x${l.reps} @RIR${l.rir ?? "-"}`).join("; ");
      parts.push(`- ${s.date} · diff ${s.difficulty}/5 · energy ${s.energy}/5 · perf ${s.performance}/5 · ${lifts}`);
    });
  }
  if (ctx.sources.length) {
    parts.push("\nAPPROVED KNOWLEDGE BASE (cite only these if referencing literature):");
    ctx.sources.forEach((s) => parts.push(`- "${s.title}"${s.author ? ` by ${s.author}` : ""}${s.category ? ` [${s.category}]` : ""}${s.summary ? ` — ${s.summary}` : ""}`));
  } else {
    parts.push("\nNo approved literature uploaded yet — give general evidence-based guidance and say so clearly if the user asks for a specific source.");
  }

  return parts.join("\n");
}

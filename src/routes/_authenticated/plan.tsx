import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dumbbell, Moon, ChevronRight, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plan")({
  component: PlanPage,
});

type ProgEx = {
  id: string;
  exercise_name: string;
  order_index: number;
  sets: number;
  rep_range: string | null;
  target_rir: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

type Day = {
  id: string;
  day_index: number;
  name: string;
  is_rest: boolean;
  muscle_groups: string[] | null;
  program_exercises: ProgEx[];
};

type Program = {
  id: string;
  name: string;
  split: string | null;
  goal: string | null;
  days_per_week: number | null;
  notes: string | null;
  program_days: Day[];
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function PlanPage() {
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { data } = await supabase
        .from("training_programs")
        .select(
          "id, name, split, goal, days_per_week, notes, program_days(id, day_index, name, is_rest, muscle_groups, program_exercises(id, exercise_name, order_index, sets, rep_range, target_rir, rest_seconds, notes))",
        )
        .eq("user_id", uid)
        .eq("active", true)
        .maybeSingle();
      setProgram((data as Program | null) ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="pt-16 text-center text-sm text-muted-foreground">Loading plan…</div>;

  if (!program) {
    return (
      <div className="space-y-4 pt-8 text-center">
        <h1 className="font-display text-2xl font-black">No active program</h1>
        <p className="text-sm text-muted-foreground">Finish onboarding to generate your weekly plan.</p>
        <Link to="/onboarding" className="inline-block text-primary">Go to onboarding →</Link>
      </div>
    );
  }

  const days = [...(program.program_days ?? [])].sort((a, b) => a.day_index - b.day_index);
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Your program</p>
        <h1 className="font-display text-2xl font-black">{program.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {program.split ?? ""} · {program.days_per_week ?? days.length} days/week · Goal: {(program.goal ?? "general").replace(/_/g, " ")}
        </p>
      </header>

      {program.notes && (
        <div className="flex gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <span>{program.notes}</span>
        </div>
      )}

      <div className="space-y-3">
        {days.map((d) => {
          const isToday = d.day_index === todayIdx % Math.max(1, days.length);
          const exercises = [...(d.program_exercises ?? [])].sort((a, b) => a.order_index - b.order_index);
          return (
            <section
              key={d.id}
              className={`rounded-2xl border p-4 ${isToday ? "border-primary/60 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${d.is_rest ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                    {d.is_rest ? <Moon className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {DAY_LABELS[d.day_index % 7]}
                      </span>
                      {isToday && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Today</span>}
                    </div>
                    <div className="font-display text-lg font-bold">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.is_rest ? "Rest day" : (d.muscle_groups ?? []).join(" · ") || "Full body"}
                    </div>
                  </div>
                </div>
                {!d.is_rest && (
                  <Link
                    to="/workout"
                    search={{ dayIndex: d.day_index }}
                  >
                    <Button size="sm" className="gap-1">
                      Start <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>

              {!d.is_rest && exercises.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {exercises.map((ex) => (
                    <li key={ex.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{ex.exercise_name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {ex.sets} × {ex.rep_range ?? "—"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        RIR {ex.target_rir ?? "—"} · Rest {ex.rest_seconds ?? 0}s
                        {ex.notes ? ` · ${ex.notes}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dumbbell,
  Moon,
  ChevronRight,
  Info,
  Pencil,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/plan")({
  component: PlanPage,
  head: () => ({
    meta: [
      { title: "Your Weekly Training Plan | STRYV" },
      {
        name: "description",
        content:
          "View and customise your weekly STRYV training split — days, exercises, sets, reps, RIR and rest periods.",
      },
      { property: "og:title", content: "Your Weekly Training Plan | STRYV" },
      {
        property: "og:description",
        content: "View and customise your weekly STRYV training split.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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

const PROGRAM_SELECT =
  "id, name, split, goal, days_per_week, notes, program_days(id, day_index, name, is_rest, muscle_groups, program_exercises(id, exercise_name, order_index, sets, rep_range, target_rir, rest_seconds, notes))";

function sortProgram(p: Program): Program {
  return {
    ...p,
    program_days: [...(p.program_days ?? [])]
      .sort((a, b) => a.day_index - b.day_index)
      .map((d) => ({
        ...d,
        program_exercises: [...(d.program_exercises ?? [])].sort(
          (a, b) => a.order_index - b.order_index,
        ),
      })),
  };
}

function PlanPage() {
  const [program, setProgram] = useState<Program | null>(null);
  const [draft, setDraft] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { data } = await supabase
        .from("training_programs")
        .select(PROGRAM_SELECT)
        .eq("user_id", uid)
        .eq("active", true)
        .maybeSingle();
      setProgram(data ? sortProgram(data as Program) : null);
      setLoading(false);
    })();
  }, []);

  const editing = draft !== null;

  function startEdit() {
    if (program) setDraft(JSON.parse(JSON.stringify(program)) as Program);
  }

  function patchDay(dayId: string, patch: Partial<Day>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            program_days: d.program_days.map((x) => (x.id === dayId ? { ...x, ...patch } : x)),
          }
        : d,
    );
  }

  function patchEx(dayId: string, exId: string, patch: Partial<ProgEx>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            program_days: d.program_days.map((x) =>
              x.id === dayId
                ? {
                    ...x,
                    program_exercises: x.program_exercises.map((e) =>
                      e.id === exId ? { ...e, ...patch } : e,
                    ),
                  }
                : x,
            ),
          }
        : d,
    );
  }

  function addExercise(dayId: string) {
    patchDayExercises(dayId, (list) => [
      ...list,
      {
        id: `new-${crypto.randomUUID()}`,
        exercise_name: "New exercise",
        order_index: list.length,
        sets: 3,
        rep_range: "8-12",
        target_rir: 2,
        rest_seconds: 90,
        notes: null,
      },
    ]);
  }

  function patchDayExercises(dayId: string, fn: (list: ProgEx[]) => ProgEx[]) {
    setDraft((d) =>
      d
        ? {
            ...d,
            program_days: d.program_days.map((x) =>
              x.id === dayId
                ? {
                    ...x,
                    program_exercises: fn(x.program_exercises).map((e, i) => ({
                      ...e,
                      order_index: i,
                    })),
                  }
                : x,
            ),
          }
        : d,
    );
  }

  function moveEx(dayId: string, index: number, dir: -1 | 1) {
    patchDayExercises(dayId, (list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addDay() {
    setDraft((d) => {
      if (!d) return d;
      const nextIndex = d.program_days.length;
      if (nextIndex >= 7) return d;
      return {
        ...d,
        program_days: [
          ...d.program_days,
          {
            id: `new-${crypto.randomUUID()}`,
            day_index: nextIndex,
            name: `Day ${nextIndex + 1}`,
            is_rest: false,
            muscle_groups: [],
            program_exercises: [],
          },
        ],
      };
    });
  }

  function removeDay(dayId: string) {
    setDraft((d) =>
      d
        ? {
            ...d,
            program_days: d.program_days
              .filter((x) => x.id !== dayId)
              .map((x, i) => ({ ...x, day_index: i })),
          }
        : d,
    );
  }

  async function save() {
    if (!draft || !program) return;
    setSaving(true);
    try {
      const keptDayIds = draft.program_days.filter((d) => !d.id.startsWith("new-")).map((d) => d.id);
      const removedDays = program.program_days
        .filter((d) => !keptDayIds.includes(d.id))
        .map((d) => d.id);
      if (removedDays.length) {
        await supabase.from("program_days").delete().in("id", removedDays);
      }

      const trainingDays = draft.program_days.filter((d) => !d.is_rest).length;
      await supabase
        .from("training_programs")
        .update({
          name: draft.name,
          split: draft.split,
          days_per_week: trainingDays,
        })
        .eq("id", program.id);

      for (const d of draft.program_days) {
        let dayId = d.id;
        if (dayId.startsWith("new-")) {
          const { data, error } = await supabase
            .from("program_days")
            .insert({
              program_id: program.id,
              day_index: d.day_index,
              name: d.name,
              is_rest: d.is_rest,
              muscle_groups: d.muscle_groups ?? [],
            })
            .select("id")
            .single();
          if (error) throw error;
          dayId = data.id;
        } else {
          const { error } = await supabase
            .from("program_days")
            .update({ day_index: d.day_index, name: d.name, is_rest: d.is_rest })
            .eq("id", dayId);
          if (error) throw error;
          await supabase.from("program_exercises").delete().eq("program_day_id", dayId);
        }

        if (!d.is_rest && d.program_exercises.length) {
          const { error } = await supabase.from("program_exercises").insert(
            d.program_exercises.map((e, i) => ({
              program_day_id: dayId,
              exercise_name: e.exercise_name || "Exercise",
              order_index: i,
              sets: e.sets ?? 3,
              rep_range: e.rep_range,
              target_rir: e.target_rir,
              rest_seconds: e.rest_seconds,
              notes: e.notes,
            })),
          );
          if (error) throw error;
        }
      }

      const { data: fresh } = await supabase
        .from("training_programs")
        .select(PROGRAM_SELECT)
        .eq("id", program.id)
        .maybeSingle();
      if (fresh) setProgram(sortProgram(fresh as Program));
      setDraft(null);
      toast.success("Plan updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save plan");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <div className="pt-16 text-center text-sm text-muted-foreground">Loading plan…</div>;

  if (!program) {
    return (
      <div className="space-y-4 pt-8 text-center">
        <h1 className="font-display text-2xl font-black">No active program</h1>
        <p className="text-sm text-muted-foreground">
          Finish onboarding to generate your weekly plan.
        </p>
        <Link to="/onboarding" className="inline-block text-primary">
          Go to onboarding →
        </Link>
      </div>
    );
  }

  const view = draft ?? program;
  const days = view.program_days;
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your program</p>
          {editing ? (
            <Input
              value={view.name}
              onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
              className="mt-1 font-display text-lg font-bold"
            />
          ) : (
            <h1 className="font-display text-2xl font-black">{view.name}</h1>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {view.split ?? ""} · {days.filter((d) => !d.is_rest).length} days/week · Goal:{" "}
            {(view.goal ?? "general").replace(/_/g, " ")}
          </p>
        </div>
        {editing ? (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={save} disabled={saving} className="gap-1">
              <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={startEdit}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
      </header>

      {view.notes && !editing && (
        <div className="flex gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <span>{view.notes}</span>
        </div>
      )}

      <div className="space-y-3">
        {days.map((d) => {
          const isToday = !editing && d.day_index === todayIdx % Math.max(1, days.length);
          const exercises = d.program_exercises ?? [];
          return (
            <section
              key={d.id}
              className={`rounded-2xl border p-4 ${isToday ? "border-primary/60 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${d.is_rest ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}
                  >
                    {d.is_rest ? <Moon className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {DAY_LABELS[d.day_index % 7]}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                          Today
                        </span>
                      )}
                    </div>
                    {editing ? (
                      <Input
                        value={d.name}
                        onChange={(e) => patchDay(d.id, { name: e.target.value })}
                        className="mt-1 h-9"
                      />
                    ) : (
                      <div className="font-display text-lg font-bold">{d.name}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {d.is_rest
                        ? "Rest day"
                        : (d.muscle_groups ?? []).join(" · ") || "Custom session"}
                    </div>
                  </div>
                </div>

                {editing ? (
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Button
                      size="sm"
                      variant={d.is_rest ? "default" : "outline"}
                      onClick={() => patchDay(d.id, { is_rest: !d.is_rest })}
                    >
                      {d.is_rest ? "Rest" : "Training"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeDay(d.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  !d.is_rest && (
                    <Link to="/workout" search={{ dayIndex: d.day_index }}>
                      <Button size="sm" className="gap-1">
                        Start <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )
                )}
              </div>

              {!d.is_rest && !editing && exercises.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {exercises.map((ex) => (
                    <li
                      key={ex.id}
                      className="rounded-lg border border-border/60 bg-background/40 p-3"
                    >
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

              {!d.is_rest && editing && (
                <div className="mt-4 space-y-2">
                  {exercises.map((ex, i) => (
                    <div
                      key={ex.id}
                      className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          value={ex.exercise_name}
                          onChange={(e) => patchEx(d.id, ex.id, { exercise_name: e.target.value })}
                          className="h-9"
                        />
                        <Button size="icon" variant="ghost" onClick={() => moveEx(d.id, i, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => moveEx(d.id, i, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            patchDayExercises(d.id, (list) => list.filter((x) => x.id !== ex.id))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <LabeledInput
                          label="Sets"
                          value={String(ex.sets ?? 3)}
                          onChange={(v) => patchEx(d.id, ex.id, { sets: Number(v) || 0 })}
                          type="number"
                        />
                        <LabeledInput
                          label="Reps"
                          value={ex.rep_range ?? ""}
                          onChange={(v) => patchEx(d.id, ex.id, { rep_range: v })}
                        />
                        <LabeledInput
                          label="RIR"
                          value={String(ex.target_rir ?? "")}
                          onChange={(v) =>
                            patchEx(d.id, ex.id, { target_rir: v === "" ? null : Number(v) })
                          }
                          type="number"
                        />
                        <LabeledInput
                          label="Rest s"
                          value={String(ex.rest_seconds ?? "")}
                          onChange={(v) =>
                            patchEx(d.id, ex.id, { rest_seconds: v === "" ? null : Number(v) })
                          }
                          type="number"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1"
                    onClick={() => addExercise(d.id)}
                  >
                    <Plus className="h-4 w-4" /> Add exercise
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {editing && days.length < 7 && (
        <Button variant="outline" className="w-full gap-1" onClick={addDay}>
          <Plus className="h-4 w-4" /> Add day
        </Button>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </label>
  );
}

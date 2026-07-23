import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Timer, Check, AlertTriangle, RefreshCcw, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { displayToKg, kgToDisplay, getCachedUnit, type Unit } from "@/lib/units";

export const Route = createFileRoute("/_authenticated/workout")({
  component: WorkoutPage,
});

type ProgEx = {
  id: string;
  exercise_id: string | null;
  exercise_name: string;
  order_index: number;
  sets: number;
  rep_range: string | null;
  target_rir: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

type SetLog = {
  set_index: number;
  weight: string;
  reps: string;
  rir: string;
  is_warmup: boolean;
  completed: boolean;
};

type ExState = {
  ex: ProgEx;
  sets: SetLog[];
  previous: { weight: number | null; reps: number | null }[];
};

function WorkoutPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ExState[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [dayName, setDayName] = useState("");
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [restLeft, setRestLeft] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [unit, setUnit] = useState<Unit>(getCachedUnit());
  const [fb, setFb] = useState({ open: false, difficulty: 3, energy: 3, performance: 3, soreness: 2 });
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void bootstrap();
    return () => { if (restRef.current) clearInterval(restRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    setUserId(uid);
    const { data: prof } = await supabase.from("profiles").select("unit_pref").eq("id", uid).maybeSingle();
    const pref = (prof?.unit_pref as Unit | undefined) ?? getCachedUnit();
    setUnit(pref);

    const { data: program } = await supabase
      .from("training_programs")
      .select("id, program_days(id, day_index, name, is_rest, program_exercises(*))")
      .eq("user_id", uid).eq("active", true).maybeSingle();

    if (!program) {
      toast.error("No active program. Complete onboarding first.");
      navigate({ to: "/onboarding" });
      return;
    }
    const daysRaw = (program.program_days ?? []) as Array<{ id: string; day_index: number; name: string; is_rest: boolean; program_exercises: ProgEx[] }>;
    const days = [...daysRaw].sort((a, b) => a.day_index - b.day_index).filter((d) => !d.is_rest);
    if (days.length === 0) { setLoading(false); return; }
    const todayIdx = ((new Date().getDay() + 6) % 7) % days.length;
    const day = days[todayIdx];
    setDayName(day.name);

    const today = new Date().toISOString().slice(0, 10);
    let { data: session } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", uid).eq("date", today).eq("program_day_id", day.id).maybeSingle();
    if (!session) {
      const { data: newS, error } = await supabase
        .from("workout_sessions")
        .insert({ user_id: uid, program_day_id: day.id, date: today, completed: false })
        .select().single();
      if (error) { toast.error(error.message); return; }
      session = newS;
    }
    setSessionId(session!.id);

    const exList = [...(day.program_exercises ?? [])].sort((a, b) => a.order_index - b.order_index);

    // Prior session data: last completed session's sets for each exercise (by exercise_name)
    const prev = await Promise.all(
      exList.map(async (ex) => {
        const { data } = await supabase
          .from("logged_sets")
          .select("weight, reps, set_index, session_id, workout_sessions!inner(user_id, date, completed)")
          .eq("exercise_name", ex.exercise_name)
          .eq("workout_sessions.user_id", uid)
          .eq("workout_sessions.completed", true)
          .lt("workout_sessions.date", today)
          .order("set_index");
        const rows = (data ?? []) as unknown as Array<{ weight: number | null; reps: number | null; set_index: number }>;
        const bySet = new Map<number, { weight: number | null; reps: number | null }>();
        rows.forEach((r) => bySet.set(r.set_index, { weight: r.weight, reps: r.reps }));
        return Array.from({ length: ex.sets }, (_, i) => bySet.get(i) ?? { weight: null, reps: null });
      }),
    );

    // Existing logged sets for this session
    const { data: existing } = await supabase
      .from("logged_sets").select("*").eq("session_id", session!.id);
    const byEx = new Map<string, typeof existing>();
    (existing ?? []).forEach((r) => {
      const list = byEx.get(r.exercise_name) ?? [];
      list.push(r);
      byEx.set(r.exercise_name, list);
    });

    setState(exList.map((ex, i) => {
      const rows = (byEx.get(ex.exercise_name) ?? []) as Array<{ set_index: number; weight: number | null; reps: number | null; rir: number | null; is_warmup: boolean }>;
      const sets: SetLog[] = Array.from({ length: ex.sets }, (_, k) => {
        const found = rows.find((r) => r.set_index === k);
        return {
          set_index: k,
          weight: found?.weight?.toString() ?? "",
          reps: found?.reps?.toString() ?? "",
          rir: found?.rir?.toString() ?? "",
          is_warmup: found?.is_warmup ?? false,
          completed: found != null,
        };
      });
      return { ex, sets, previous: prev[i] };
    }));
    setLoading(false);
  }

  function startRest(sec: number) {
    if (restRef.current) clearInterval(restRef.current);
    setRestLeft(sec);
    restRef.current = setInterval(() => {
      setRestLeft((r) => {
        if (r <= 1) { if (restRef.current) clearInterval(restRef.current); return 0; }
        return r - 1;
      });
    }, 1000);
  }

  async function toggleSetComplete(exIdx: number, setIdx: number) {
    if (!sessionId || !userId) return;
    const es = state[exIdx];
    const st = es.sets[setIdx];
    const nextCompleted = !st.completed;

    if (nextCompleted) {
      // Insert or replace: delete existing at (session, exercise_name, set_index) then insert
      await supabase.from("logged_sets")
        .delete()
        .eq("session_id", sessionId)
        .eq("exercise_name", es.ex.exercise_name)
        .eq("set_index", setIdx);
      const { error } = await supabase.from("logged_sets").insert({
        session_id: sessionId,
        user_id: userId,
        exercise_id: es.ex.exercise_id,
        exercise_name: es.ex.exercise_name,
        set_index: setIdx,
        weight: st.weight ? Number(st.weight) : null,
        reps: st.reps ? Number(st.reps) : null,
        rir: st.rir ? Number(st.rir) : null,
        is_warmup: st.is_warmup,
      });
      if (error) { toast.error(error.message); return; }
      if (es.ex.rest_seconds) startRest(es.ex.rest_seconds);
    } else {
      await supabase.from("logged_sets")
        .delete()
        .eq("session_id", sessionId)
        .eq("exercise_name", es.ex.exercise_name)
        .eq("set_index", setIdx);
    }

    setState((prev) => {
      const copy = [...prev];
      copy[exIdx] = { ...copy[exIdx], sets: copy[exIdx].sets.map((s, i) => i === setIdx ? { ...s, completed: nextCompleted } : s) };
      return copy;
    });
  }

  function updateSet(exIdx: number, setIdx: number, patch: Partial<SetLog>) {
    setState((prev) => {
      const copy = [...prev];
      copy[exIdx] = { ...copy[exIdx], sets: copy[exIdx].sets.map((s, i) => i === setIdx ? { ...s, ...patch } : s) };
      return copy;
    });
  }

  function addSet(exIdx: number) {
    setState((prev) => {
      const copy = [...prev];
      const last = copy[exIdx].sets.length;
      copy[exIdx] = { ...copy[exIdx], sets: [...copy[exIdx].sets, { set_index: last, weight: "", reps: "", rir: "", is_warmup: false, completed: false }] };
      return copy;
    });
  }

  function reportPain(exIdx: number) {
    const reason = window.prompt("Describe what you're feeling. Sharp pain → stop this exercise and consider seeing a physio.");
    if (!reason) return;
    setState((prev) => {
      const copy = [...prev];
      copy[exIdx] = { ...copy[exIdx], ex: { ...copy[exIdx].ex, notes: [copy[exIdx].ex.notes, `⚠️ Pain reported: ${reason}`].filter(Boolean).join(" · ") } };
      return copy;
    });
    toast.warning("Consider stopping this exercise. Sharp pain → see a qualified physio.");
  }

  function replaceExercise(exIdx: number) {
    const alt = window.prompt(`Replace "${state[exIdx].ex.exercise_name}" with:`);
    if (!alt) return;
    const reason = window.prompt("Reason for swap? (equipment, discomfort, preference)") ?? "";
    setState((prev) => {
      const copy = [...prev];
      copy[exIdx] = {
        ...copy[exIdx],
        ex: { ...copy[exIdx].ex, exercise_name: alt, notes: [copy[exIdx].ex.notes, `Swapped: ${reason}`].filter(Boolean).join(" · ") },
        sets: copy[exIdx].sets.map((s) => ({ ...s, completed: false })),
      };
      return copy;
    });
  }

  async function finishWorkout() {
    if (!sessionId) return;
    setFinishing(true);
    const { error } = await supabase.from("workout_sessions").update({
      completed: true,
      difficulty: fb.difficulty,
      energy: fb.energy,
      performance: fb.performance,
      soreness_notes: `Soreness: ${fb.soreness}/5`,
      ended_at: new Date().toISOString(),
    }).eq("id", sessionId);
    setFinishing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Session complete. Great work.");
    navigate({ to: "/dashboard" });
  }

  if (loading) return <div className="pt-16 text-center text-sm text-muted-foreground">Loading workout…</div>;
  if (!state.length) return <div className="pt-16 text-center text-sm text-muted-foreground">Rest day. Enjoy it.</div>;

  const es = state[current];
  const totalSets = state.reduce((a, s) => a + s.sets.length, 0);
  const doneSets = state.reduce((a, s) => a + s.sets.filter((x) => x.completed).length, 0);
  const overallPct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Today</p>
        <h1 className="font-display text-2xl font-black">{dayName}</h1>
        <Progress value={overallPct} className="mt-3 h-1" />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Exercise {current + 1}/{state.length}</span>
          <span>{doneSets}/{totalSets} sets</span>
        </div>
      </header>

      {restLeft > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
          <Timer className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-bold">{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}</span>
          <span className="text-xs text-muted-foreground">Rest</span>
          <button onClick={() => setRestLeft(0)} className="ml-auto text-xs text-primary">Skip</button>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold">{es.ex.exercise_name}</h2>
            <p className="text-xs text-muted-foreground">
              {es.ex.sets} × {es.ex.rep_range ?? "-"} @ RIR {es.ex.target_rir ?? "-"} · Rest {es.ex.rest_seconds ?? 0}s
            </p>
            {es.ex.notes && <p className="mt-1 text-xs text-muted-foreground">{es.ex.notes}</p>}
          </div>
          <div className="flex gap-1">
            <button onClick={() => replaceExercise(current)} className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground" title="Swap"><RefreshCcw className="h-4 w-4" /></button>
            <button onClick={() => reportPain(current)} className="rounded-md border border-border p-2 text-destructive" title="Report pain"><AlertTriangle className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-[auto_1fr_1fr_60px_auto] items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="w-6 text-center">#</span>
            <span>Weight</span>
            <span>Reps</span>
            <span>RIR</span>
            <span className="w-8" />
          </div>
          {es.sets.map((s, i) => {
            const prev = es.previous[i];
            return (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr_60px_auto] items-center gap-2">
                <button
                  onClick={() => updateSet(current, i, { is_warmup: !s.is_warmup })}
                  className={`h-8 w-6 rounded text-xs font-bold ${s.is_warmup ? "text-muted-foreground" : "text-foreground"}`}
                  title="Toggle warm-up"
                >
                  {s.is_warmup ? "W" : i + 1}
                </button>
                <Input inputMode="decimal" placeholder={prev?.weight != null ? `${prev.weight}` : "kg"} value={s.weight} onChange={(e) => updateSet(current, i, { weight: e.target.value })} className="h-9" />
                <Input inputMode="numeric" placeholder={prev?.reps != null ? `${prev.reps}` : "reps"} value={s.reps} onChange={(e) => updateSet(current, i, { reps: e.target.value })} className="h-9" />
                <Input inputMode="numeric" placeholder="-" value={s.rir} onChange={(e) => updateSet(current, i, { rir: e.target.value })} className="h-9" />
                <button
                  onClick={() => toggleSetComplete(current, i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border ${s.completed ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button onClick={() => addSet(current)} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" /> Add set
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        {current < state.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        ) : (
          <Button onClick={() => setFb({ ...fb, open: true })}>Finish workout</Button>
        )}
      </div>

      {fb.open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display text-xl font-bold">How did it feel?</h3>
            <p className="text-xs text-muted-foreground">Rate 1 (easy) to 5 (max).</p>
            <div className="mt-4 space-y-3">
              {(["difficulty","energy","performance","soreness"] as const).map((k) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-xs"><Label className="capitalize">{k}</Label><span className="text-muted-foreground">{fb[k]}</span></div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} onClick={() => setFb({ ...fb, [k]: n })}
                        className={`h-9 flex-1 rounded-md border text-sm ${fb[k] === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" onClick={() => setFb({ ...fb, open: false })} className="flex-1">Cancel</Button>
              <Button onClick={finishWorkout} disabled={finishing} className="flex-1">{finishing ? "Saving…" : "Complete"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

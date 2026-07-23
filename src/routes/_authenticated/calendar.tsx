import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Dumbbell, Utensils, Scale, Camera, X } from "lucide-react";
import { formatWeight, getCachedUnit } from "@/lib/units";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type DayData = {
  session?: { id: string; program_day_name?: string; completed: boolean; set_count: number; volume: number };
  daily?: { weight_kg: number | null; mood: number | null; fasted: boolean; note: string | null };
  foods: { name: string; meal_type: string; calories: number; servings: number }[];
  weekly?: { photo_front_url: string | null; photo_back_url: string | null; biggest_win: string | null; biggest_challenge: string | null; recommendation: string | null };
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

function CalendarPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [byDate, setByDate] = useState<Map<string, DayData>>(new Map());
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const unit = getCachedUnit();

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const leading = (first.getDay() + 6) % 7; // Monday-first
    const cells: (Date | null)[] = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return { cells, first: iso(first), last: iso(last) };
  }, [cursor]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const from = monthDays.first, to = monthDays.last;

      const [sessions, dailies, foods, weeklies] = await Promise.all([
        supabase.from("workout_sessions")
          .select("id, date, completed, program_days(name), logged_sets(weight, reps)")
          .eq("user_id", uid).gte("date", from).lte("date", to),
        supabase.from("daily_checkins").select("date, weight_kg, mood, fasted, note").eq("user_id", uid).gte("date", from).lte("date", to),
        supabase.from("food_logs").select("date, name, meal_type, calories, servings").eq("user_id", uid).gte("date", from).lte("date", to),
        supabase.from("weekly_checkins").select("week_start, photo_front_url, photo_back_url, biggest_win, biggest_challenge, recommendation").eq("user_id", uid).gte("week_start", from).lte("week_start", to),
      ]);

      const map = new Map<string, DayData>();
      const ensure = (d: string): DayData => {
        let x = map.get(d);
        if (!x) { x = { foods: [] }; map.set(d, x); }
        return x;
      };

      (sessions.data ?? []).forEach((s) => {
        const sets = (s.logged_sets ?? []) as Array<{ weight: number | null; reps: number | null }>;
        const set_count = sets.length;
        const volume = sets.reduce((a, r) => a + (r.weight ?? 0) * (r.reps ?? 0), 0);
        const pdName = (s as { program_days?: { name?: string } | null }).program_days?.name;
        ensure(s.date).session = { id: s.id, program_day_name: pdName, completed: !!s.completed, set_count, volume: Math.round(volume) };
      });
      (dailies.data ?? []).forEach((d) => {
        ensure(d.date).daily = { weight_kg: d.weight_kg == null ? null : Number(d.weight_kg), mood: d.mood, fasted: !!d.fasted, note: d.note };
      });
      (foods.data ?? []).forEach((f) => {
        ensure(f.date).foods.push({ name: f.name, meal_type: f.meal_type, calories: Number(f.calories), servings: Number(f.servings) });
      });
      const paths: string[] = [];
      (weeklies.data ?? []).forEach((w) => {
        ensure(w.week_start).weekly = {
          photo_front_url: w.photo_front_url,
          photo_back_url: w.photo_back_url,
          biggest_win: w.biggest_win,
          biggest_challenge: w.biggest_challenge,
          recommendation: w.recommendation,
        };
        if (w.photo_front_url) paths.push(w.photo_front_url);
        if (w.photo_back_url) paths.push(w.photo_back_url);
      });
      setByDate(map);

      // Sign photo URLs
      if (paths.length > 0) {
        const signed = new Map<string, string>();
        await Promise.all(paths.map(async (p) => {
          const { data } = await supabase.storage.from("progress-photos").createSignedUrl(p, 3600);
          if (data?.signedUrl) signed.set(p, data.signedUrl);
        }));
        setPhotoUrls(signed);
      } else {
        setPhotoUrls(new Map());
      }
    })();
  }, [monthDays.first, monthDays.last]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayStr = iso(new Date());
  const sel = selected ? byDate.get(selected) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/progress" className="text-xs text-muted-foreground hover:text-foreground">← Progress</Link>
        <h1 className="font-display text-2xl font-black">Calendar</h1>
        <span className="w-16" />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-md p-2 hover:bg-background"><ChevronLeft className="h-4 w-4" /></button>
        <div className="font-display text-lg font-bold capitalize">{monthLabel}</div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-md p-2 hover:bg-background"><ChevronRight className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {["M","T","W","T","F","S","S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthDays.cells.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const ds = iso(d);
          const data = byDate.get(ds);
          const isToday = ds === todayStr;
          const hasWorkout = data?.session?.completed;
          const hasDaily = !!data?.daily;
          const hasFood = (data?.foods.length ?? 0) > 0;
          const hasPhoto = !!(data?.weekly?.photo_front_url || data?.weekly?.photo_back_url);
          const any = hasWorkout || hasDaily || hasFood || hasPhoto;
          return (
            <button
              key={i}
              onClick={() => setSelected(ds)}
              className={`aspect-square rounded-lg border p-1 text-left transition ${
                isToday ? "border-primary" : any ? "border-border bg-card hover:border-primary/50" : "border-border/40 text-muted-foreground"
              }`}
            >
              <div className="text-xs font-semibold">{d.getDate()}</div>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {hasWorkout && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Workout" />}
                {hasDaily && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Weigh-in" />}
                {hasFood && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Food" />}
                {hasPhoto && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" title="Photos" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <Legend color="bg-primary" label="Workout" />
        <Legend color="bg-emerald-500" label="Weigh-in" />
        <Legend color="bg-amber-500" label="Food" />
        <Legend color="bg-sky-500" label="Photos" />
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5">
            <button onClick={() => setSelected(null)} className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-background"><X className="h-4 w-4" /></button>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {new Date(selected).toLocaleDateString(undefined, { weekday: "long" })}
            </div>
            <h2 className="font-display text-2xl font-black">
              {new Date(selected).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
            </h2>

            <div className="mt-4 space-y-3">
              {sel?.daily ? (
                <Section icon={Scale} title="Daily weigh-in">
                  <div className="text-sm">
                    <span className="font-semibold">{formatWeight(sel.daily.weight_kg, unit)}</span>
                    <span className="text-muted-foreground"> · {sel.daily.fasted ? "Fasted" : "Not fasted"}</span>
                    {sel.daily.mood != null && <span className="text-muted-foreground"> · Mood {sel.daily.mood}/5</span>}
                  </div>
                  {sel.daily.note && <p className="mt-1 text-xs text-muted-foreground">"{sel.daily.note}"</p>}
                </Section>
              ) : <EmptyRow icon={Scale} label="No weigh-in" />}

              {sel?.session ? (
                <Section icon={Dumbbell} title={sel.session.program_day_name || "Workout"}>
                  <div className="text-sm">
                    {sel.session.completed ? "✓ Completed" : "In progress"} · {sel.session.set_count} sets logged
                    {sel.session.volume > 0 && <> · vol {sel.session.volume}</>}
                  </div>
                </Section>
              ) : <EmptyRow icon={Dumbbell} label="No workout logged" />}

              {sel?.foods.length ? (
                <Section icon={Utensils} title={`Food (${Math.round(sel.foods.reduce((a, f) => a + f.calories * f.servings, 0))} kcal)`}>
                  <ul className="space-y-1 text-sm">
                    {sel.foods.map((f, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate"><span className="text-muted-foreground capitalize">{f.meal_type}</span> · {f.name}</span>
                        <span className="text-muted-foreground shrink-0">{Math.round(f.calories * f.servings)} kcal</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : <EmptyRow icon={Utensils} label="No food logged" />}

              {sel?.weekly && (sel.weekly.photo_front_url || sel.weekly.photo_back_url) && (
                <Section icon={Camera} title="Progress photos">
                  <div className="grid grid-cols-2 gap-2">
                    {sel.weekly.photo_front_url && (
                      <PhotoTile label="Front" src={photoUrls.get(sel.weekly.photo_front_url)} />
                    )}
                    {sel.weekly.photo_back_url && (
                      <PhotoTile label="Back" src={photoUrls.get(sel.weekly.photo_back_url)} />
                    )}
                  </div>
                </Section>
              )}

              {sel?.weekly && (sel.weekly.biggest_win || sel.weekly.biggest_challenge || sel.weekly.recommendation) && (
                <div className="space-y-2 rounded-xl border border-border bg-background p-3 text-sm">
                  {sel.weekly.biggest_win && <p><span className="font-medium text-primary">Win:</span> {sel.weekly.biggest_win}</p>}
                  {sel.weekly.biggest_challenge && <p><span className="font-medium">Challenge:</span> {sel.weekly.biggest_challenge}</p>}
                  {sel.weekly.recommendation && <p className="text-xs text-muted-foreground">Coach: {sel.weekly.recommendation}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </div>
      {children}
    </div>
  );
}
function EmptyRow({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
  );
}
function PhotoTile({ label, src }: { label: string; src?: string }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-background">
      {src ? <img src={src} alt={label} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading…</div>}
      <div className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 text-[10px] font-medium backdrop-blur">{label}</div>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</div>;
}

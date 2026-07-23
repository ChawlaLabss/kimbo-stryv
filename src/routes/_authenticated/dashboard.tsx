import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Flame, TrendingUp, Trophy, Clock, ChevronRight, ClipboardCheck, Scale, Bell } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatWeight, getCachedUnit, setCachedUnit, type Unit } from "@/lib/units";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type DashboardData = {
  name: string;
  program: { id: string; name: string; split: string } | null;
  todayDay: { id: string; name: string; muscle_groups: string[]; exercise_count: number } | null;
  weekProgress: { done: number; planned: number };
  streak: number;
  weightKg: number | null;
  dailyDone: boolean;
};

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [unit, setUnit] = useState<Unit>(getCachedUnit());

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;

      const today = new Date().toISOString().slice(0, 10);
      const [profile, onb, program, sessions, meas, daily] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle(),
        supabase.from("onboarding_responses").select("completed, days_per_week, weight_kg").eq("user_id", uid).maybeSingle(),
        supabase.from("training_programs").select("*, program_days(*, program_exercises(count))").eq("user_id", uid).eq("active", true).maybeSingle(),
        supabase.from("workout_sessions").select("id, date, completed").eq("user_id", uid).eq("completed", true).gte("date", weekStart()),
        supabase.from("body_measurements").select("weight_kg, date").eq("user_id", uid).order("date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("daily_checkins").select("id, weight_kg").eq("user_id", uid).eq("date", today).maybeSingle(),
      ]);

      if (!onb.data?.completed) {
        navigate({ to: "/onboarding" });
        return;
      }

      const todayIdx = ((new Date().getDay() + 6) % 7);
      const days = (program.data?.program_days ?? []) as Array<{ id: string; day_index: number; name: string; muscle_groups: string[]; program_exercises: { count: number }[] }>;
      const sorted = [...days].sort((a, b) => a.day_index - b.day_index);
      const todayDay = sorted[todayIdx % Math.max(1, sorted.length)] ?? sorted[0] ?? null;

      setData({
        name: profile.data?.display_name ?? "athlete",
        program: program.data ? { id: program.data.id, name: program.data.name, split: program.data.split ?? "" } : null,
        todayDay: todayDay ? { id: todayDay.id, name: todayDay.name, muscle_groups: todayDay.muscle_groups ?? [], exercise_count: todayDay.program_exercises?.[0]?.count ?? 0 } : null,
        weekProgress: { done: sessions.data?.length ?? 0, planned: onb.data?.days_per_week ?? 4 },
        streak: sessions.data?.length ?? 0,
        weightKg: daily.data?.weight_kg ?? meas.data?.weight_kg ?? onb.data?.weight_kg ?? null,
        dailyDone: !!daily.data,
      });
      setLoading(false);
    })();
  }, [navigate]);

  if (loading || !data) {
    return <div className="pt-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const pct = data.weekProgress.planned ? Math.round((data.weekProgress.done / data.weekProgress.planned) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Link to="/profile" className="text-xs text-muted-foreground">Profile</Link>
      </header>

      <div>
        <p className="text-sm text-muted-foreground">Good morning,</p>
        <h1 className="font-display text-3xl font-black">{data.name} <span className="text-primary">💪</span></h1>
        <p className="text-sm text-muted-foreground">Ready to STRV today?</p>
      </div>

      {!data.dailyDone ? (
        <Link
          to="/daily-checkin"
          className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 hover:border-primary"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Daily check-in</div>
            <div className="text-xs text-muted-foreground">Log today's weigh-in to keep your trend sharp</div>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </Link>
      ) : (
        <Link
          to="/daily-checkin"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Scale className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Today's weigh-in logged ✓</div>
            <div className="text-xs text-muted-foreground">{data.weightKg ? `${data.weightKg} kg` : "Tap to update"}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}


      <div
        className="relative overflow-hidden rounded-2xl border border-border p-5"
        style={{ background: "linear-gradient(135deg, oklch(0.22 0.02 25), oklch(0.18 0.005 260))" }}
      >
        <div className="flex items-center gap-3 text-sm">
          <span className="text-primary">"</span>
          <span className="font-medium">Discipline today. Strength tomorrow.</span>
        </div>
      </div>

      {/* Overview stats */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Overview</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Stat icon={Flame} value={data.streak} label="Sessions" />
          <Stat icon={TrendingUp} value={`${pct}%`} label="This week" />
          <Stat icon={Trophy} value={data.weekProgress.done} label="Workouts" />
          <Stat icon={Clock} value={data.weekProgress.planned} label="Planned" />
        </div>
      </div>

      {/* Today's plan */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's plan</h2>
          {data.program && <span className="text-xs text-muted-foreground">{data.program.split}</span>}
        </div>
        {data.todayDay ? (
          <Link to="/workout" className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Flame className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-display text-lg font-bold">{data.todayDay.name}</div>
                <div className="text-xs text-muted-foreground">{data.todayDay.muscle_groups.join(" · ") || "Full body"}</div>
                <div className="mt-1 text-xs text-muted-foreground">{data.todayDay.exercise_count} exercises</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No program yet. <Link to="/onboarding" className="text-primary">Complete assessment →</Link>
          </div>
        )}
      </div>

      {/* Weekly check-in card */}
      <Link to="/checkin" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/50">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Weekly check-in</div>
          <div className="text-xs text-muted-foreground">Track progress and get plan adjustments</div>
        </div>
        <Button size="sm" variant="outline">Start</Button>
      </Link>

      {/* Progress preview */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Progress</h2>
          <Link to="/progress" className="text-xs text-primary">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Body weight</div>
            <div className="mt-1 font-display text-2xl font-bold">{data.weightKg ? `${data.weightKg} kg` : "—"}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Week progress</div>
            <div className="mt-1 font-display text-2xl font-bold">{data.weekProgress.done}/{data.weekProgress.planned}</div>
            <Progress value={pct} className="mt-2 h-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function weekStart(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

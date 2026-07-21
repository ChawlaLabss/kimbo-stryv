import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { Trophy, TrendingUp, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});

type Point = { date: string; value: number };
type PR = { exercise_name: string; weight: number; reps: number; date: string };

function ProgressPage() {
  const [weight, setWeight] = useState<Point[]>([]);
  const [volume, setVolume] = useState<Point[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [adherence, setAdherence] = useState({ done: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;

      const [meas, sessions] = await Promise.all([
        supabase.from("body_measurements").select("date, weight_kg").eq("user_id", uid).order("date"),
        supabase.from("workout_sessions").select("id, date, completed, logged_sets(weight, reps, exercise_name)").eq("user_id", uid).order("date"),
      ]);

      setWeight((meas.data ?? []).filter((r) => r.weight_kg != null).map((r) => ({ date: r.date, value: Number(r.weight_kg) })));

      const volumePoints: Point[] = [];
      const bestByExercise = new Map<string, PR>();
      (sessions.data ?? []).forEach((s) => {
        if (!s.completed) return;
        const sets = (s.logged_sets ?? []) as Array<{ weight: number | null; reps: number | null; exercise_name: string }>;
        let vol = 0;
        sets.forEach((set) => {
          if (set.weight != null && set.reps != null) {
            vol += set.weight * set.reps;
            const prev = bestByExercise.get(set.exercise_name);
            if (!prev || set.weight > prev.weight) {
              bestByExercise.set(set.exercise_name, { exercise_name: set.exercise_name, weight: set.weight, reps: set.reps, date: s.date });
            }
          }
        });
        if (vol > 0) volumePoints.push({ date: s.date, value: Math.round(vol) });
      });
      setVolume(volumePoints);
      setPrs(Array.from(bestByExercise.values()).slice(0, 6));
      setAdherence({ done: (sessions.data ?? []).filter((s) => s.completed).length });

      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="pt-16 text-center text-sm text-muted-foreground">Loading progress…</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-black">Progress</h1>

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={Trophy} label="PRs" value={prs.length} />
        <StatCard icon={Dumbbell} label="Sessions" value={adherence.done} />
        <StatCard icon={TrendingUp} label="Weight logs" value={weight.length} />
      </div>

      <Card title="Body weight">
        {weight.length < 2 ? <Empty text="Log measurements in the weekly check-in." /> : (
          <ChartWrap>
            <LineChart data={weight}>
              <CartesianGrid stroke="oklch(0.24 0.005 260)" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis stroke="oklch(0.65 0.02 260)" fontSize={11} domain={["auto","auto"]} />
              <Tooltip contentStyle={{ background: "oklch(0.20 0.005 260)", border: "1px solid oklch(0.28 0.005 260)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke="oklch(0.62 0.22 25)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ChartWrap>
        )}
      </Card>

      <Card title="Training volume per session">
        {volume.length < 2 ? <Empty text="Complete a couple of workouts to see volume trends." /> : (
          <ChartWrap>
            <BarChart data={volume}>
              <CartesianGrid stroke="oklch(0.24 0.005 260)" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis stroke="oklch(0.65 0.02 260)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.20 0.005 260)", border: "1px solid oklch(0.28 0.005 260)", borderRadius: 8 }} />
              <Bar dataKey="value" fill="oklch(0.62 0.22 25)" radius={[4,4,0,0]} />
            </BarChart>
          </ChartWrap>
        )}
      </Card>

      <Card title="Personal records">
        {prs.length === 0 ? <Empty text="Your PRs will appear as you log sets." /> : (
          <div className="divide-y divide-border">
            {prs.map((p) => (
              <div key={p.exercise_name} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{p.exercise_name}</div>
                  <div className="text-xs text-muted-foreground">{p.date}</div>
                </div>
                <div className="font-display text-lg font-bold text-primary">{p.weight}kg × {p.reps}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}
function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-primary" />
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
function ChartWrap({ children }: { children: React.ReactElement }) {
  return <div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}
function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{text}</p>;
}

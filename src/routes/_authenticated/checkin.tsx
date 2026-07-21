import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/checkin")({
  component: CheckIn,
});

type F = {
  body_weight_kg: string;
  workouts_completed: string;
  workouts_planned: string;
  sleep_quality: string;
  stress_level: string;
  soreness: string;
  motivation: string;
  energy: string;
  pain_notes: string;
  recovery: string;
  notes: string;
};

const empty: F = {
  body_weight_kg: "", workouts_completed: "", workouts_planned: "4",
  sleep_quality: "3", stress_level: "3", soreness: "3",
  motivation: "3", energy: "3", pain_notes: "",
  recovery: "3", notes: "",
};

function CheckIn() {
  const navigate = useNavigate();
  const [f, setF] = useState<F>(empty);
  const [saving, setSaving] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: m } = await supabase.from("body_measurements").select("weight_kg").eq("user_id", u.user!.id).order("date", { ascending: false }).limit(1).maybeSingle();
      if (m?.weight_kg) setF((p) => ({ ...p, body_weight_kg: `${m.weight_kg}` }));
    })();
  }, []);

  function generateRecommendation(): string {
    const soreness = Number(f.soreness);
    const energy = Number(f.energy);
    const recovery = Number(f.recovery);
    const pain = f.pain_notes.trim().length > 0;

    if (pain) return "PAIN reported — pause the affected movement, substitute with a pain-free alternative, and consider seeing a qualified physio before pushing volume.";
    if (soreness >= 4 && recovery <= 2) return "Recovery low, soreness high — reduce volume by ~20% next week and prioritize sleep. Keep intensity, cut a set from each exercise.";
    if (energy <= 2 && recovery <= 2) return "Fatigue trending up — consider a light deload week (2/3 sets @ RIR 3-4) before pushing again.";
    if (energy >= 4 && recovery >= 4) return "You're crushing it — add a small load progression (2.5–5kg upper, 5–10kg lower) or 1 rep across the top of your rep range.";
    return "Maintain current volume and intensity. Aim for small load or rep progression where you're hitting the top of your rep range at target RIR.";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const rec = generateRecommendation();
      const { error } = await supabase.from("weekly_checkins").insert({
        user_id: uid,
        week_start: weekStart(),
        body_weight_kg: f.body_weight_kg ? Number(f.body_weight_kg) : null,
        workouts_completed: f.workouts_completed ? Number(f.workouts_completed) : null,
        workouts_planned: f.workouts_planned ? Number(f.workouts_planned) : null,
        sleep_quality: Number(f.sleep_quality),
        stress_level: Number(f.stress_level),
        soreness: Number(f.soreness),
        motivation: Number(f.motivation),
        energy: Number(f.energy),
        pain_notes: f.pain_notes || null,
        recovery: Number(f.recovery),
        notes: f.notes || null,
        recommendation: rec,
      });
      if (error) throw error;
      if (f.body_weight_kg) {
        await supabase.from("body_measurements").insert({
          user_id: uid, date: new Date().toISOString().slice(0, 10),
          weight_kg: Number(f.body_weight_kg),
        });
      }
      setRecommendation(rec);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (recommendation) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-black">This week's plan</h1>
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <p className="text-sm">{recommendation}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate({ to: "/dashboard" })} className="flex-1">Approve and continue</Button>
          <Button variant="outline" onClick={() => { setRecommendation(null); setF(empty); }}>Redo</Button>
        </div>
        <p className="text-xs text-muted-foreground">Plan adjustments are conservative. Trends over multiple weeks matter more than any one session.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">Weekly check-in</h1>
        <p className="text-sm text-muted-foreground">Answers guide next week's plan.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Body weight (kg)"><Input type="number" step={0.1} value={f.body_weight_kg} onChange={(e) => setF({ ...f, body_weight_kg: e.target.value })} /></Field>
        <Field label="Workouts completed"><Input type="number" value={f.workouts_completed} onChange={(e) => setF({ ...f, workouts_completed: e.target.value })} /></Field>
      </div>

      {([
        ["sleep_quality","Sleep quality"],
        ["stress_level","Stress level"],
        ["soreness","Soreness"],
        ["motivation","Motivation"],
        ["energy","Energy"],
        ["recovery","Perceived recovery"],
      ] as const).map(([k, label]) => (
        <Slider1to5 key={k} label={label} value={f[k]} onChange={(v) => setF({ ...f, [k]: v })} />
      ))}

      <Field label="Any pain or injury concerns?">
        <Textarea value={f.pain_notes} onChange={(e) => setF({ ...f, pain_notes: e.target.value })} placeholder="Describe location and severity" />
      </Field>
      <Field label="Anything else">
        <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </Field>

      <Button type="submit" disabled={saving} className="w-full h-11">{saving ? "Analyzing…" : "Get my plan"}</Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Slider1to5({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm"><Label>{label}</Label><span className="text-muted-foreground">{value}/5</span></div>
      <div className="flex gap-1">
        {[1,2,3,4,5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(String(n))}
            className={`h-10 flex-1 rounded-md border text-sm ${Number(value) === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function weekStart(): string {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

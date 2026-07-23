import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Camera, X, Sparkles } from "lucide-react";
import { displayToKg, kgToDisplay, getCachedUnit, type Unit } from "@/lib/units";

export const Route = createFileRoute("/_authenticated/checkin")({
  component: CheckIn,
});

type F = {
  body_weight: string;
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
  meal_accuracy: string;
  water_accuracy: string;
  steps_completed: string;
  hunger: string;
  digestion: string;
  biggest_challenge: string;
  biggest_win: string;
};

const empty: F = {
  body_weight: "", workouts_completed: "", workouts_planned: "4",
  sleep_quality: "3", stress_level: "3", soreness: "3",
  motivation: "3", energy: "3", pain_notes: "",
  recovery: "3", notes: "",
  meal_accuracy: "3", water_accuracy: "3", steps_completed: "",
  hunger: "3", digestion: "3",
  biggest_challenge: "", biggest_win: "",
};

function weekStart(): string {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function CheckIn() {
  const navigate = useNavigate();
  const [unit, setUnit] = useState<Unit>(getCachedUnit());
  const [f, setF] = useState<F>(empty);
  const [saving, setSaving] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [nutritionAuto, setNutritionAuto] = useState<{ calAcc: number; days: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { data: profile } = await supabase.from("profiles").select("unit_pref").eq("id", uid).maybeSingle();
      const pref = (profile?.unit_pref as Unit | undefined) ?? getCachedUnit();
      setUnit(pref);

      const wkStart = weekStart();
      const [m, sessions, plan, foods, daily] = await Promise.all([
        supabase.from("body_measurements").select("weight_kg").eq("user_id", uid).order("date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("workout_sessions").select("id, completed, date").eq("user_id", uid).gte("date", wkStart),
        supabase.from("meal_plans").select("daily_calories").eq("user_id", uid).eq("active", true).maybeSingle(),
        supabase.from("food_logs").select("date, calories, servings").eq("user_id", uid).gte("date", wkStart),
        supabase.from("daily_checkins").select("weight_kg").eq("user_id", uid).order("date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const weightKg = daily.data?.weight_kg ?? m.data?.weight_kg ?? null;
      const done = (sessions.data ?? []).filter((s) => s.completed).length;

      // Auto-compute meal accuracy from actual food logs vs plan target
      let mealAccuracy = 3;
      let auto: { calAcc: number; days: number } | null = null;
      if (plan.data?.daily_calories && (foods.data ?? []).length > 0) {
        const target = Number(plan.data.daily_calories);
        const byDay = new Map<string, number>();
        (foods.data ?? []).forEach((r) => {
          const total = Number(r.calories) * Number(r.servings ?? 1);
          byDay.set(r.date, (byDay.get(r.date) ?? 0) + total);
        });
        const ratios = Array.from(byDay.values()).map((cal) => {
          const diff = Math.abs(cal - target) / target; // 0 = perfect
          return Math.max(0, 1 - diff); // 1 = perfect adherence
        });
        const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        auto = { calAcc: Math.round(avg * 100), days: byDay.size };
        // Map 0..1 → 1..5
        mealAccuracy = Math.max(1, Math.min(5, Math.round(avg * 4 + 1)));
      }
      setNutritionAuto(auto);

      setF((p) => ({
        ...p,
        body_weight: weightKg != null ? String(kgToDisplay(Number(weightKg), pref) ?? "") : "",
        workouts_completed: String(done),
        meal_accuracy: String(mealAccuracy),
      }));
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

  async function uploadPhoto(uid: string, file: File, side: "front" | "back"): Promise<string | null> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${uid}/${weekStart()}-${side}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("progress-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const rec = generateRecommendation();

      let photo_front_url: string | null = null;
      let photo_back_url: string | null = null;
      if (frontFile) photo_front_url = await uploadPhoto(uid, frontFile, "front");
      if (backFile) photo_back_url = await uploadPhoto(uid, backFile, "back");

      const bodyKg = f.body_weight ? displayToKg(f.body_weight, unit) : null;

      const { error } = await supabase.from("weekly_checkins").insert({
        user_id: uid,
        week_start: weekStart(),
        body_weight_kg: bodyKg,
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
        meal_accuracy: Number(f.meal_accuracy),
        water_accuracy: Number(f.water_accuracy),
        steps_completed: f.steps_completed ? Number(f.steps_completed) : null,
        hunger: Number(f.hunger),
        digestion: Number(f.digestion),
        biggest_challenge: f.biggest_challenge || null,
        biggest_win: f.biggest_win || null,
        photo_front_url,
        photo_back_url,
      });
      if (error) throw error;
      if (bodyKg) {
        await supabase.from("body_measurements").insert({
          user_id: uid, date: new Date().toISOString().slice(0, 10), weight_kg: bodyKg,
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
          <Button variant="outline" onClick={() => { setRecommendation(null); setF(empty); setFrontFile(null); setBackFile(null); setFrontPreview(null); setBackPreview(null); }}>Redo</Button>
        </div>
        <p className="text-xs text-muted-foreground">Plan adjustments are conservative. Trends over multiple weeks matter more than any one session.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">Weekly check-in</h1>
        <p className="text-sm text-muted-foreground">Answers guide next week's plan. Values pre-filled from what you've logged.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Body weight (${unit})`}><Input type="number" step={0.1} value={f.body_weight} onChange={(e) => setF({ ...f, body_weight: e.target.value })} /></Field>
        <Field label="Workouts completed"><Input type="number" value={f.workouts_completed} onChange={(e) => setF({ ...f, workouts_completed: e.target.value })} /></Field>
        <Field label="Avg daily steps"><Input type="number" value={f.steps_completed} onChange={(e) => setF({ ...f, steps_completed: e.target.value })} placeholder="e.g. 8000" /></Field>
      </div>

      {nutritionAuto && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <div className="font-medium">Nutrition auto-scored from your food log</div>
            <div className="text-muted-foreground">
              Avg calorie adherence <span className="text-foreground">{nutritionAuto.calAcc}%</span> over {nutritionAuto.days} logged {nutritionAuto.days === 1 ? "day" : "days"}. Adjust below if it feels off.
            </div>
          </div>
        </div>
      )}

      {([
        ["meal_accuracy","Meal plan accuracy"],
        ["water_accuracy","Water intake accuracy"],
        ["hunger","Hunger levels"],
        ["digestion","Digestion / bowel movements"],
        ["sleep_quality","Sleep quality"],
        ["stress_level","Stress level"],
        ["soreness","Soreness"],
        ["motivation","Motivation"],
        ["energy","Energy"],
        ["recovery","Perceived recovery"],
      ] as const).map(([k, label]) => (
        <Slider1to5 key={k} label={label} value={f[k]} onChange={(v) => setF({ ...f, [k]: v })} />
      ))}

      <Field label="Biggest challenge this week">
        <Textarea value={f.biggest_challenge} onChange={(e) => setF({ ...f, biggest_challenge: e.target.value })} placeholder="What did you struggle with?" />
      </Field>
      <Field label="Biggest win this week">
        <Textarea value={f.biggest_win} onChange={(e) => setF({ ...f, biggest_win: e.target.value })} placeholder="What are you proud of?" />
      </Field>

      <div className="space-y-2">
        <Label>Progress photos</Label>
        <p className="text-xs text-muted-foreground">Private to your account. Same lighting and pose helps track change.</p>
        <div className="grid grid-cols-2 gap-3">
          <PhotoPicker label="Front" file={frontFile} preview={frontPreview} onChange={(file, url) => { setFrontFile(file); setFrontPreview(url); }} />
          <PhotoPicker label="Back" file={backFile} preview={backPreview} onChange={(file, url) => { setBackFile(file); setBackPreview(url); }} />
        </div>
      </div>

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

function PhotoPicker({ label, file, preview, onChange }: {
  label: string; file: File | null; preview: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    onChange(f, URL.createObjectURL(f));
  }
  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  }
  return (
    <div>
      {preview ? (
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border">
          <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
          <button type="button" onClick={clear} className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur" aria-label={`Remove ${label}`}><X className="h-4 w-4" /></button>
          <div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium backdrop-blur">{label}</div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground">
          <Camera className="h-5 w-5" />
          <span className="text-xs font-medium">{label}</span>
          <span className="text-[10px]">Tap to add</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      {file && <div className="mt-1 truncate text-[10px] text-muted-foreground">{file.name}</div>}
    </div>
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

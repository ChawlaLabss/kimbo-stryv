import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";

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
  meal_accuracy: string;
  water_accuracy: string;
  steps_completed: string;
  hunger: string;
  digestion: string;
  biggest_challenge: string;
  biggest_win: string;
};

const empty: F = {
  body_weight_kg: "", workouts_completed: "", workouts_planned: "4",
  sleep_quality: "3", stress_level: "3", soreness: "3",
  motivation: "3", energy: "3", pain_notes: "",
  recovery: "3", notes: "",
  meal_accuracy: "3", water_accuracy: "3", steps_completed: "",
  hunger: "3", digestion: "3",
  biggest_challenge: "", biggest_win: "",
};

function CheckIn() {
  const navigate = useNavigate();
  const [f, setF] = useState<F>(empty);
  const [saving, setSaving] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

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
        <p className="text-sm text-muted-foreground">Answers guide next week's plan.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Body weight (kg)"><Input type="number" step={0.1} value={f.body_weight_kg} onChange={(e) => setF({ ...f, body_weight_kg: e.target.value })} /></Field>
        <Field label="Workouts completed"><Input type="number" value={f.workouts_completed} onChange={(e) => setF({ ...f, workouts_completed: e.target.value })} /></Field>
        <Field label="Avg daily steps"><Input type="number" value={f.steps_completed} onChange={(e) => setF({ ...f, steps_completed: e.target.value })} placeholder="e.g. 8000" /></Field>
      </div>

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

function PhotoPicker({
  label, file, preview, onChange,
}: {
  label: string;
  file: File | null;
  preview: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    const url = URL.createObjectURL(f);
    onChange(f, url);
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
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur"
            aria-label={`Remove ${label} photo`}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium backdrop-blur">{label}</div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <Camera className="h-5 w-5" />
          <span className="text-xs font-medium">{label}</span>
          <span className="text-[10px]">Tap to add</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={pick}
      />
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

function weekStart(): string {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

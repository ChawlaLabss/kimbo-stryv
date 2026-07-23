import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/Logo";
import { generateProgram } from "@/lib/program-generator";
import { generateMealPlan } from "@/lib/meal-plan-generator";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

type Form = {
  age_range: string;
  sex: string;
  height_cm: string;
  weight_kg: string;
  units: string;
  goal: string;
  target_weight_kg: string;
  timeline_weeks: string;
  experience: string;
  days_per_week: string;
  session_minutes: string;
  location: string;
  equipment: string[];
  split_preference: string;
  priority_muscles: string[];
  injuries: string;
  avoid_exercises: string;
  sleep_hours: string;
  stress_level: string;
  activity_level: string;
  dietary_preferences: string;
  allergies: string;
  diet_type: string;
  allergies_list: string[];
  sensitivities_list: string[];
  disliked_foods: string;
};

const empty: Form = {
  age_range: "", sex: "", height_cm: "", weight_kg: "", units: "metric",
  goal: "", target_weight_kg: "", timeline_weeks: "12", experience: "",
  days_per_week: "4", session_minutes: "60", location: "", equipment: [],
  split_preference: "", priority_muscles: [], injuries: "", avoid_exercises: "",
  sleep_hours: "7", stress_level: "3", activity_level: "", dietary_preferences: "",
  allergies: "", diet_type: "omnivore", allergies_list: [], sensitivities_list: [],
  disliked_foods: "",
};

const EQUIPMENT_OPTIONS = ["Barbell","Dumbbells","Cables","Machines","Bench","Pull-up bar","Kettlebells","Bands","Bodyweight only"];
const MUSCLE_OPTIONS = ["Chest","Back","Shoulders","Arms","Quads","Hamstrings","Glutes","Calves","Core"];
const DIET_OPTIONS = ["omnivore","vegetarian","vegan","pescetarian","keto","low_carb","halal","kosher"];
const ALLERGY_OPTIONS = ["Peanuts","Tree nuts","Dairy","Eggs","Soy","Gluten","Wheat","Shellfish","Fish","Sesame"];
const SENSITIVITY_OPTIONS = ["Lactose","Gluten","FODMAPs","Spicy food","Caffeine","Artificial sweeteners"];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from("onboarding_responses").select("*").eq("user_id", userData.user.id).maybeSingle();
      if (data?.completed) navigate({ to: "/dashboard" });
      if (data) {
        setF({
          age_range: data.age_range ?? "", sex: data.sex ?? "",
          height_cm: data.height_cm?.toString() ?? "", weight_kg: data.weight_kg?.toString() ?? "",
          units: data.units ?? "metric", goal: data.goal ?? "",
          target_weight_kg: data.target_weight_kg?.toString() ?? "",
          timeline_weeks: data.timeline_weeks?.toString() ?? "12",
          experience: data.experience ?? "",
          days_per_week: data.days_per_week?.toString() ?? "4",
          session_minutes: data.session_minutes?.toString() ?? "60",
          location: data.location ?? "", equipment: data.equipment ?? [],
          split_preference: data.split_preference ?? "",
          priority_muscles: data.priority_muscles ?? [],
          injuries: data.injuries ?? "", avoid_exercises: data.avoid_exercises ?? "",
          sleep_hours: data.sleep_hours?.toString() ?? "7",
          stress_level: data.stress_level?.toString() ?? "3",
          activity_level: data.activity_level ?? "",
          dietary_preferences: data.dietary_preferences ?? "",
          allergies: data.allergies ?? "",
          diet_type: (data as { diet_type?: string }).diet_type ?? "omnivore",
          allergies_list: (data as { allergies_list?: string[] }).allergies_list ?? [],
          sensitivities_list: (data as { sensitivities_list?: string[] }).sensitivities_list ?? [],
          disliked_foods: ((data as { disliked_foods?: string[] }).disliked_foods ?? []).join(", "),
        });
      }
    })();
  }, [navigate]);

  const steps = ["About you", "Goals", "Experience", "Equipment", "Priorities", "Recovery", "Review"];
  const progress = ((step + 1) / steps.length) * 100;

  function toggleArr(key: "equipment" | "priority_muscles" | "allergies_list" | "sensitivities_list", value: string) {
    setF((p) => {
      const arr = p[key] as string[];
      return { ...p, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }

  const dislikesArr = () => f.disliked_foods.split(/[,;]/).map((s) => s.trim()).filter(Boolean);

  async function handleFinish() {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const payload = {
        user_id: uid,
        age_range: f.age_range || null, sex: f.sex || null,
        height_cm: f.height_cm ? Number(f.height_cm) : null,
        weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
        units: f.units, goal: f.goal || null,
        target_weight_kg: f.target_weight_kg ? Number(f.target_weight_kg) : null,
        timeline_weeks: f.timeline_weeks ? Number(f.timeline_weeks) : null,
        experience: f.experience || null,
        days_per_week: f.days_per_week ? Number(f.days_per_week) : null,
        session_minutes: f.session_minutes ? Number(f.session_minutes) : null,
        location: f.location || null, equipment: f.equipment,
        split_preference: f.split_preference || null,
        priority_muscles: f.priority_muscles,
        injuries: f.injuries || null, avoid_exercises: f.avoid_exercises || null,
        sleep_hours: f.sleep_hours ? Number(f.sleep_hours) : null,
        stress_level: f.stress_level ? Number(f.stress_level) : null,
        activity_level: f.activity_level || null,
        dietary_preferences: f.diet_type || f.dietary_preferences || null,
        allergies: f.allergies_list.join(", ") || f.allergies || null,
        diet_type: f.diet_type || null,
        allergies_list: f.allergies_list,
        sensitivities_list: f.sensitivities_list,
        disliked_foods: dislikesArr(),
        completed: true,
      };
      const { error: obErr } = await supabase.from("onboarding_responses").upsert(payload, { onConflict: "user_id" });
      if (obErr) throw obErr;

      // Deactivate old programs and generate a new one
      await supabase.from("training_programs").update({ active: false }).eq("user_id", uid);

      const prog = generateProgram({
        ...payload,
        days_per_week: payload.days_per_week,
      });
      const { data: progRow, error: pErr } = await supabase
        .from("training_programs")
        .insert({
          user_id: uid,
          name: prog.name, split: prog.split,
          days_per_week: prog.days_per_week, goal: prog.goal,
          notes: prog.notes, active: true,
        })
        .select()
        .single();
      if (pErr) throw pErr;

      for (const d of prog.days) {
        const { data: dayRow, error: dErr } = await supabase
          .from("program_days")
          .insert({
            program_id: progRow.id, day_index: d.day_index,
            name: d.name, muscle_groups: d.muscle_groups, is_rest: d.is_rest,
          })
          .select()
          .single();
        if (dErr) throw dErr;
        if (d.exercises.length) {
          const { error: eErr } = await supabase.from("program_exercises").insert(
            d.exercises.map((e, i) => ({
              program_day_id: dayRow.id,
              exercise_name: e.name, order_index: i,
              sets: e.sets, rep_range: e.rep_range,
              target_rir: e.target_rir, rest_seconds: e.rest_seconds,
              notes: e.notes ?? null,
            })),
          );
          if (eErr) throw eErr;
        }
      }

      // Generate meal plan
      await supabase.from("meal_plans").update({ active: false }).eq("user_id", uid);
      const mp = generateMealPlan(payload);
      await supabase.from("meal_plans").insert({
        user_id: uid,
        active: true,
        daily_calories: mp.daily_calories,
        protein_g: mp.protein_g,
        carbs_g: mp.carbs_g,
        fat_g: mp.fat_g,
        fiber_g: mp.fiber_g,
        water_ml: mp.water_ml,
        meals_per_day: mp.meals_per_day,
        excluded: mp.excluded,
        goal: mp.goal,
        notes: mp.notes,
        meals: mp.meals,
      });

      toast.success("Program generated. Let's train.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <Logo />
        <span className="text-xs text-muted-foreground">Step {step + 1} / {steps.length}</span>
      </header>
      <Progress value={progress} className="mt-4 h-1" />

      <div className="mt-8 space-y-6">
        <h1 className="font-display text-3xl font-bold">{steps[step]}</h1>

        {step === 0 && (
          <div className="space-y-5">
            <Field label="Age range">
              <RadioGroup value={f.age_range} onValueChange={(v) => setF({ ...f, age_range: v })} className="grid grid-cols-3 gap-2">
                {["18-24","25-34","35-44","45-54","55-64","65+"].map((v) => (
                  <ChipRadio key={v} value={v} label={v} />
                ))}
              </RadioGroup>
            </Field>
            <Field label="Sex (used for calculations only)">
              <RadioGroup value={f.sex} onValueChange={(v) => setF({ ...f, sex: v })} className="grid grid-cols-3 gap-2">
                {["male","female","prefer_not_to_say"].map((v) => <ChipRadio key={v} value={v} label={v.replace(/_/g," ")} />)}
              </RadioGroup>
            </Field>
            <Field label="Units">
              <RadioGroup value={f.units} onValueChange={(v) => setF({ ...f, units: v })} className="grid grid-cols-2 gap-2">
                <ChipRadio value="metric" label="Metric (kg/cm)" />
                <ChipRadio value="imperial" label="Imperial (lb/in)" />
              </RadioGroup>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Height (${f.units === "metric" ? "cm" : "in"})`}>
                <Input type="number" value={f.height_cm} onChange={(e) => setF({ ...f, height_cm: e.target.value })} />
              </Field>
              <Field label={`Weight (${f.units === "metric" ? "kg" : "lb"})`}>
                <Input type="number" value={f.weight_kg} onChange={(e) => setF({ ...f, weight_kg: e.target.value })} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field label="Primary goal">
              <RadioGroup value={f.goal} onValueChange={(v) => setF({ ...f, goal: v })} className="grid gap-2">
                {[
                  ["muscle_gain","Muscle gain"],
                  ["fat_loss","Fat loss"],
                  ["recomposition","Recomposition"],
                  ["strength","Strength"],
                  ["competition","Bodybuilding competition prep"],
                  ["general","General fitness"],
                ].map(([v,l]) => <ChipRadio key={v} value={v} label={l} />)}
              </RadioGroup>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Target weight (${f.units === "metric" ? "kg" : "lb"})`}>
                <Input type="number" value={f.target_weight_kg} onChange={(e) => setF({ ...f, target_weight_kg: e.target.value })} />
              </Field>
              <Field label="Timeline (weeks)">
                <Input type="number" value={f.timeline_weeks} onChange={(e) => setF({ ...f, timeline_weeks: e.target.value })} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Field label="Training experience">
              <RadioGroup value={f.experience} onValueChange={(v) => setF({ ...f, experience: v })} className="grid gap-2">
                <ChipRadio value="beginner" label="Beginner — 0-1 years" />
                <ChipRadio value="intermediate" label="Intermediate — 1-3 years" />
                <ChipRadio value="advanced" label="Advanced — 3+ years" />
              </RadioGroup>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Days per week">
                <Input type="number" min={2} max={6} value={f.days_per_week} onChange={(e) => setF({ ...f, days_per_week: e.target.value })} />
              </Field>
              <Field label="Session length (min)">
                <Input type="number" value={f.session_minutes} onChange={(e) => setF({ ...f, session_minutes: e.target.value })} />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <Field label="Training location">
              <RadioGroup value={f.location} onValueChange={(v) => setF({ ...f, location: v })} className="grid gap-2">
                <ChipRadio value="commercial_gym" label="Commercial gym" />
                <ChipRadio value="home_gym" label="Home gym" />
                <ChipRadio value="limited" label="Limited equipment" />
              </RadioGroup>
            </Field>
            <Field label="Available equipment">
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((v) => (
                  <label key={v} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                    <Checkbox checked={f.equipment.includes(v)} onCheckedChange={() => toggleArr("equipment", v)} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Preferred split">
              <RadioGroup value={f.split_preference} onValueChange={(v) => setF({ ...f, split_preference: v })} className="grid grid-cols-2 gap-2">
                {["Full Body","Upper/Lower","Push/Pull/Legs","Bro Split","No preference"].map((v) => (
                  <ChipRadio key={v} value={v} label={v} />
                ))}
              </RadioGroup>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <Field label="Priority muscle groups">
              <div className="grid grid-cols-3 gap-2">
                {MUSCLE_OPTIONS.map((v) => (
                  <label key={v} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                    <Checkbox checked={f.priority_muscles.includes(v)} onCheckedChange={() => toggleArr("priority_muscles", v)} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Injuries, restrictions, or medical conditions">
              <Textarea value={f.injuries} onChange={(e) => setF({ ...f, injuries: e.target.value })} placeholder="e.g. chronic left shoulder impingement" />
            </Field>
            <Field label="Exercises to avoid">
              <Textarea value={f.avoid_exercises} onChange={(e) => setF({ ...f, avoid_exercises: e.target.value })} placeholder="e.g. overhead press, conventional deadlift" />
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Average sleep (hours)">
                <Input type="number" step={0.5} value={f.sleep_hours} onChange={(e) => setF({ ...f, sleep_hours: e.target.value })} />
              </Field>
              <Field label="Stress level (1-5)">
                <Input type="number" min={1} max={5} value={f.stress_level} onChange={(e) => setF({ ...f, stress_level: e.target.value })} />
              </Field>
            </div>
            <Field label="Daily activity">
              <RadioGroup value={f.activity_level} onValueChange={(v) => setF({ ...f, activity_level: v })} className="grid gap-2">
                {["sedentary","lightly_active","moderately_active","very_active"].map((v) => (
                  <ChipRadio key={v} value={v} label={v.replace(/_/g, " ")} />
                ))}
              </RadioGroup>
            </Field>
            <Field label="Diet type">
              <RadioGroup value={f.diet_type} onValueChange={(v) => setF({ ...f, diet_type: v })} className="grid grid-cols-2 gap-2">
                {DIET_OPTIONS.map((v) => (
                  <ChipRadio key={v} value={v} label={v.replace(/_/g, " ")} />
                ))}
              </RadioGroup>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Your meal plan will filter out foods that don't fit this diet and tie calories to your goal ({f.goal.replace(/_/g, " ") || "—"}).
              </p>
            </Field>
            <Field label="Allergies (won't appear in your plan)">
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((a) => {
                  const on = f.allergies_list.includes(a);
                  return (
                    <button
                      type="button"
                      key={a}
                      onClick={() => toggleArr("allergies_list", a)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Food sensitivities">
              <div className="flex flex-wrap gap-2">
                {SENSITIVITY_OPTIONS.map((a) => {
                  const on = f.sensitivities_list.includes(a);
                  return (
                    <button
                      type="button"
                      key={a}
                      onClick={() => toggleArr("sensitivities_list", a)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Disliked foods (comma-separated)">
              <Input
                value={f.disliked_foods}
                onChange={(e) => setF({ ...f, disliked_foods: e.target.value })}
                placeholder="e.g. broccoli, salmon, cottage cheese"
              />
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Review your answers — you can go back to change anything before we build your program.</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Summary label="Goal" value={f.goal.replace(/_/g," ") || "—"} />
              <Summary label="Experience" value={f.experience || "—"} />
              <Summary label="Days/week" value={f.days_per_week} />
              <Summary label="Session length" value={`${f.session_minutes} min`} />
              <Summary label="Location" value={f.location.replace(/_/g," ") || "—"} />
              <Summary label="Split" value={f.split_preference || "—"} />
              <Summary label="Equipment" value={f.equipment.join(", ") || "—"} />
              <Summary label="Priorities" value={f.priority_muscles.join(", ") || "—"} />
              <Summary label="Injuries" value={f.injuries || "None reported"} />
              <Summary label="Sleep / stress" value={`${f.sleep_hours}h / ${f.stress_level}`} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={saving}>
            {saving ? "Building program…" : "Generate my program"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ChipRadio({ value, label }: { value: string; label: string }) {
  return (
    <label
      htmlFor={`r-${value}`}
      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm capitalize transition-colors hover:border-primary/50 has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/15 has-[button[data-state=checked]]:text-primary has-[button[data-state=checked]]:font-semibold"
    >
      <RadioGroupItem value={value} id={`r-${value}`} className="sr-only" />
      {label}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium capitalize">{value}</div>
    </div>
  );
}

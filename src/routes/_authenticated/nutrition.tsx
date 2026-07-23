import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, Utensils, Sparkles, ChevronLeft } from "lucide-react";
import { generateMealPlan } from "@/lib/meal-plan-generator";

export const Route = createFileRoute("/_authenticated/nutrition")({
  component: NutritionPage,
});

type MealSuggestion = {
  name: string; time: string; calories: number;
  protein_g: number; carbs_g: number; fat_g: number; items: string[];
};

type MealPlan = {
  id: string;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
  meals: MealSuggestion[];
};

type FoodLog = {
  id: string;
  meal_type: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servings: number;
};

const today = () => new Date().toISOString().slice(0, 10);

function NutritionPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "plan">("today");

  const [form, setForm] = useState({
    meal_type: "breakfast",
    name: "",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    servings: "1",
  });

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    const [p, l] = await Promise.all([
      supabase.from("meal_plans").select("*").eq("user_id", uid).eq("active", true).maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", uid).eq("date", today()).order("created_at", { ascending: true }),
    ]);
    setPlan(p.data as MealPlan | null);
    setLogs((l.data as FoodLog[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function regenerate() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    const { data: onb } = await supabase.from("onboarding_responses").select("*").eq("user_id", uid).maybeSingle();
    if (!onb) { toast.error("Complete onboarding first"); return; }
    const mp = generateMealPlan(onb);
    await supabase.from("meal_plans").update({ active: false }).eq("user_id", uid);
    const { error } = await supabase.from("meal_plans").insert({
      user_id: uid, active: true,
      daily_calories: mp.daily_calories, protein_g: mp.protein_g,
      carbs_g: mp.carbs_g, fat_g: mp.fat_g, goal: mp.goal, notes: mp.notes, meals: mp.meals,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Meal plan updated");
    load();
  }

  async function addFood(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.calories) { toast.error("Name and calories required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("food_logs").insert({
      user_id: u.user!.id,
      date: today(),
      meal_type: form.meal_type,
      name: form.name,
      calories: Number(form.calories) || 0,
      protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0,
      fat_g: Number(form.fat_g) || 0,
      servings: Number(form.servings) || 1,
    });
    if (error) { toast.error(error.message); return; }
    setForm({ ...form, name: "", calories: "", protein_g: "", carbs_g: "", fat_g: "", servings: "1" });
    load();
  }

  async function removeLog(id: string) {
    await supabase.from("food_logs").delete().eq("id", id);
    load();
  }

  async function quickAddMeal(m: MealSuggestion) {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("food_logs").insert({
      user_id: u.user!.id, date: today(),
      meal_type: m.name.toLowerCase().includes("snack") ? "snack" : m.name.toLowerCase(),
      name: m.items.join(", "),
      calories: m.calories, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g,
      servings: 1,
    });
    toast.success(`${m.name} logged`);
    load();
  }

  if (loading) return <div className="pt-16 text-center text-sm text-muted-foreground">Loading…</div>;

  const totals = logs.reduce(
    (a, l) => ({
      cal: a.cal + l.calories * l.servings,
      p: a.p + Number(l.protein_g) * l.servings,
      c: a.c + Number(l.carbs_g) * l.servings,
      f: a.f + Number(l.fat_g) * l.servings,
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  const pct = (v: number, t?: number) => (t && t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl font-black">Nutrition</h1>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-card p-1">
        <button
          onClick={() => setTab("today")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "today" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Today's Food
        </button>
        <button
          onClick={() => setTab("plan")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "plan" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Meal Plan
        </button>
      </div>

      {!plan && (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          No meal plan yet.
          <Button size="sm" variant="outline" className="ml-2" onClick={regenerate}>
            <Sparkles className="mr-1 h-4 w-4" /> Generate
          </Button>
        </div>
      )}

      {tab === "today" && (
        <>
          {plan && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Today</div>
                  <div className="font-display text-3xl font-black">
                    {Math.round(totals.cal)} <span className="text-base font-normal text-muted-foreground">/ {plan.daily_calories} kcal</span>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {Math.max(0, plan.daily_calories - Math.round(totals.cal))} left
                </div>
              </div>
              <Progress value={pct(totals.cal, plan.daily_calories)} className="h-2" />
              <div className="grid grid-cols-3 gap-3 pt-2">
                <MacroBar label="Protein" value={totals.p} target={plan.protein_g} unit="g" />
                <MacroBar label="Carbs" value={totals.c} target={plan.carbs_g} unit="g" />
                <MacroBar label="Fat" value={totals.f} target={plan.fat_g} unit="g" />
              </div>
            </div>
          )}

          <form onSubmit={addFood} className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-bold">Add food</h2>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["breakfast", "lunch", "dinner", "snack"].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setForm({ ...form, meal_type: m })}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition ${form.meal_type === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken & rice" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Calories" v={form.calories} on={(v) => setForm({ ...form, calories: v })} />
              <NumField label="Servings" v={form.servings} on={(v) => setForm({ ...form, servings: v })} />
              <NumField label="Protein (g)" v={form.protein_g} on={(v) => setForm({ ...form, protein_g: v })} />
              <NumField label="Carbs (g)" v={form.carbs_g} on={(v) => setForm({ ...form, carbs_g: v })} />
              <NumField label="Fat (g)" v={form.fat_g} on={(v) => setForm({ ...form, fat_g: v })} />
            </div>
            <Button type="submit" className="w-full">Log food</Button>
          </form>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logged today</h2>
            {logs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Nothing logged yet.
              </div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Utensils className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {l.meal_type} · {Math.round(l.calories * l.servings)} kcal · P{Math.round(Number(l.protein_g) * l.servings)} C{Math.round(Number(l.carbs_g) * l.servings)} F{Math.round(Number(l.fat_g) * l.servings)}
                    </div>
                  </div>
                  <button onClick={() => removeLog(l.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "plan" && plan && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <TargetCell label="kcal" value={plan.daily_calories} />
            <TargetCell label="Protein" value={`${plan.protein_g}g`} />
            <TargetCell label="Carbs" value={`${plan.carbs_g}g`} />
            <TargetCell label="Fat" value={`${plan.fat_g}g`} />
          </div>
          {plan.meals.map((m, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-base font-bold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.time} · {m.calories} kcal · P{m.protein_g} C{m.carbs_g} F{m.fat_g}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => quickAddMeal(m)}>Log</Button>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {m.items.map((it, j) => <li key={j}>• {it}</li>)}
              </ul>
            </div>
          ))}
          {plan.notes && (
            <p className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">{plan.notes}</p>
          )}
          <Button variant="outline" className="w-full" onClick={regenerate}>
            <Sparkles className="mr-2 h-4 w-4" /> Regenerate plan
          </Button>
        </div>
      )}
    </div>
  );
}

function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const p = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}/{target}{unit}</span>
      </div>
      <Progress value={p} className="h-1.5" />
    </div>
  );
}

function NumField({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" inputMode="decimal" value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}

function TargetCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="font-display text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

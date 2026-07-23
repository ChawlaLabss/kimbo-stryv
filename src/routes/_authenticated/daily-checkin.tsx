import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { displayToKg, kgToDisplay, getCachedUnit, setCachedUnit, type Unit } from "@/lib/units";

export const Route = createFileRoute("/_authenticated/daily-checkin")({
  component: DailyCheckIn,
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const MOODS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "😃", label: "Good" },
  { value: 5, emoji: "🔥", label: "Great" },
];

function DailyCheckIn() {
  const navigate = useNavigate();
  const [unit, setUnit] = useState<Unit>(getCachedUnit());
  const [weight, setWeight] = useState("");
  const [fasted, setFasted] = useState(true);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { data: profile } = await supabase.from("profiles").select("unit_pref").eq("id", uid).maybeSingle();
      const pref = (profile?.unit_pref as Unit | undefined) ?? getCachedUnit();
      setUnit(pref);
      setCachedUnit(pref);

      const { data } = await supabase
        .from("daily_checkins")
        .select("weight_kg, note, fasted, mood")
        .eq("user_id", uid)
        .eq("date", today())
        .maybeSingle();
      if (data) {
        setExisting(true);
        if (data.weight_kg != null) setWeight(String(kgToDisplay(Number(data.weight_kg), pref) ?? ""));
        if (data.note) setNote(data.note);
        if (typeof data.fasted === "boolean") setFasted(data.fasted);
        if (data.mood != null) setMood(Number(data.mood));
      } else {
        const { data: m } = await supabase
          .from("body_measurements")
          .select("weight_kg")
          .eq("user_id", uid)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (m?.weight_kg) setWeight(String(kgToDisplay(Number(m.weight_kg), pref) ?? ""));
      }
    })();
  }, []);

  async function updateUnit(next: Unit) {
    setUnit(next);
    setCachedUnit(next);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("profiles").update({ unit_pref: next }).eq("id", u.user.id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return toast.error("Enter your weight");
    const kg = displayToKg(weight, unit);
    if (kg == null || kg <= 0) return toast.error("Invalid weight");
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { error } = await supabase
        .from("daily_checkins")
        .upsert(
          { user_id: uid, date: today(), weight_kg: kg, fasted, mood, note: note || null },
          { onConflict: "user_id,date" },
        );
      if (error) throw error;

      // Mirror into body_measurements so long-term trend + progress charts see it.
      const { data: existingBm } = await supabase
        .from("body_measurements")
        .select("id").eq("user_id", uid).eq("date", today()).maybeSingle();
      if (existingBm) {
        await supabase.from("body_measurements").update({ weight_kg: kg }).eq("id", existingBm.id);
      } else {
        await supabase.from("body_measurements").insert({ user_id: uid, date: today(), weight_kg: kg });
      }

      toast.success("Check-in saved");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">Daily check-in</h1>
          <p className="text-sm text-muted-foreground">
            {existing ? "Update today's check-in." : "Log today's weigh-in and how you're feeling."}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-full border border-border text-xs">
          {(["kg","lb"] as const).map((u) => (
            <button key={u} type="button" onClick={() => updateUnit(u)}
              className={`px-3 py-1.5 font-medium ${unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {u.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Body weight ({unit})</Label>
        <Input
          type="number"
          step={0.1}
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={unit === "lb" ? "e.g. 172.8" : "e.g. 78.4"}
          autoFocus
        />
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setFasted(true)}
            className={`h-9 flex-1 rounded-md border text-sm ${fasted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            Fasted
          </button>
          <button type="button" onClick={() => setFasted(false)}
            className={`h-9 flex-1 rounded-md border text-sm ${!fasted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            Not fasted
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Fasted weigh-ins after waking give the most consistent trend.
        </p>
      </div>

      <div className="space-y-2">
        <Label>How are you feeling today?</Label>
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <button key={m.value} type="button" onClick={() => setMood(m.value)}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 rounded-md border text-xs ${mood === m.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              aria-label={m.label}>
              <span className="text-xl">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Note (optional)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering about today?" rows={3} />
      </div>

      <Button type="submit" disabled={saving} className="h-11 w-full">
        {saving ? "Saving…" : "Save check-in"}
      </Button>
    </form>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
      const { data } = await supabase
        .from("daily_checkins")
        .select("weight_kg, note, fasted, mood")
        .eq("user_id", uid)
        .eq("date", today())
        .maybeSingle();
      if (data) {
        setExisting(true);
        if (data.weight_kg != null) setWeight(String(data.weight_kg));
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
        if (m?.weight_kg) setWeight(String(m.weight_kg));
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) {
      toast.error("Enter your weight");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const w = Number(weight);
      const { error } = await supabase
        .from("daily_checkins")
        .upsert(
          { user_id: uid, date: today(), weight_kg: w, fasted, mood, note: note || null },
          { onConflict: "user_id,date" },
        );
      if (error) throw error;
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
      <div>
        <h1 className="font-display text-2xl font-black">Daily check-in</h1>
        <p className="text-sm text-muted-foreground">
          {existing ? "Update today's check-in." : "Log today's weigh-in and how you're feeling."}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Body weight (kg)</Label>
        <Input
          type="number"
          step={0.1}
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 78.4"
          autoFocus
        />
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setFasted(true)}
            className={`h-9 flex-1 rounded-md border text-sm ${fasted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            Fasted
          </button>
          <button
            type="button"
            onClick={() => setFasted(false)}
            className={`h-9 flex-1 rounded-md border text-sm ${!fasted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            Not fasted
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Fasted weigh-ins after waking, before eating or drinking, give the most consistent trend.
        </p>
      </div>

      <div className="space-y-2">
        <Label>How are you feeling today?</Label>
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 rounded-md border text-xs ${mood === m.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              aria-label={m.label}
            >
              <span className="text-xl">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Note (optional)</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything worth remembering about today?"
          rows={3}
        />
      </div>

      <Button type="submit" disabled={saving} className="h-11 w-full">
        {saving ? "Saving…" : "Save check-in"}
      </Button>
    </form>
  );
}

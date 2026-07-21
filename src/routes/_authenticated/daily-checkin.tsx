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

function DailyCheckIn() {
  const navigate = useNavigate();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { data } = await supabase
        .from("daily_checkins")
        .select("weight_kg, note")
        .eq("user_id", uid)
        .eq("date", today())
        .maybeSingle();
      if (data) {
        setExisting(true);
        if (data.weight_kg != null) setWeight(String(data.weight_kg));
        if (data.note) setNote(data.note);
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
          { user_id: uid, date: today(), weight_kg: w, note: note || null },
          { onConflict: "user_id,date" },
        );
      if (error) throw error;
      await supabase.from("body_measurements").upsert(
        { user_id: uid, date: today(), weight_kg: w },
        { onConflict: "user_id,date" },
      );
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
          {existing ? "Update today's weigh-in." : "Log today's weight to track your trend."}
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
      </div>

      <div className="space-y-2">
        <Label>Note (optional)</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How are you feeling today?"
          rows={3}
        />
      </div>

      <Button type="submit" disabled={saving} className="h-11 w-full">
        {saving ? "Saving…" : "Save check-in"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Weigh in at the same time each day for the most consistent trend — ideally after waking, before eating.
      </p>
    </form>
  );
}

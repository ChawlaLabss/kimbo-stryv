import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, RefreshCcw, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
      setName(p?.display_name ?? "");
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      setIsAdmin((role ?? []).some((r) => r.role === "admin"));
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("profiles").upsert({ id: u.user!.id, display_name: name });
    setSaving(false);
    toast.success("Saved");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-black">Profile</h1>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input value={email} disabled /></div>
        <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
      </div>

      <Link to="/onboarding" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <RefreshCcw className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="font-medium">Redo assessment</div>
          <div className="text-xs text-muted-foreground">Regenerate your training plan.</div>
        </div>
      </Link>

      {isAdmin && (
        <Link to="/admin/knowledge" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <Shield className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium">Admin — Knowledge base</div>
            <div className="text-xs text-muted-foreground">Manage uploaded coaching literature.</div>
          </div>
        </Link>
      )}

      <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground hover:text-foreground">
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      <p className="pt-4 text-center text-[10px] text-muted-foreground">
        STRV provides educational fitness guidance. It is not a substitute for medical care.
      </p>
    </div>
  );
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/knowledge")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw redirect({ to: "/dashboard" });
  },
  component: AdminKnowledge,
});

type Source = {
  id: string; title: string; author: string | null; category: string | null;
  tags: string[] | null; summary: string | null; active: boolean; created_at: string;
};

function AdminKnowledge() {
  const [sources, setSources] = useState<Source[]>([]);
  const [f, setF] = useState({ title: "", author: "", category: "", tags: "", summary: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data } = await supabase.from("knowledge_sources").select("*").order("created_at", { ascending: false });
    setSources((data ?? []) as Source[]);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("knowledge_sources").insert({
      title: f.title, author: f.author || null, category: f.category || null,
      tags: f.tags ? f.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      summary: f.summary || null, active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setF({ title: "", author: "", category: "", tags: "", summary: "" });
    toast.success("Source added");
    void load();
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from("knowledge_sources").update({ active: !active }).eq("id", id);
    void load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this source?")) return;
    await supabase.from("knowledge_sources").delete().eq("id", id);
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-primary">Admin</p>
        <h1 className="font-display text-2xl font-black">Knowledge base</h1>
        <p className="text-sm text-muted-foreground">Sources ground the AI coach. Only titles/metadata for v1 — full retrieval coming next.</p>
      </div>

      <form onSubmit={add} className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2"><Label>Title *</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Scientific Principles of Hypertrophy Training" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Author</Label><Input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></div>
          <div className="space-y-2"><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="hypertrophy / programming / recovery" /></div>
        </div>
        <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></div>
        <div className="space-y-2"><Label>Summary / coaching principles</Label><Textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="Key takeaways the AI should be able to draw from." /></div>
        <Button type="submit" disabled={saving} className="w-full">{saving ? "Adding…" : "Add source"}</Button>
      </form>

      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sources ({sources.length})</h2>
        {sources.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
        {sources.map((s) => (
          <div key={s.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <FileText className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-muted-foreground">{[s.author, s.category].filter(Boolean).join(" · ")}</div>
              {s.summary && <p className="mt-1 text-xs text-muted-foreground">{s.summary}</p>}
            </div>
            <button onClick={() => toggle(s.id, s.active)} className={`rounded-md border px-2 py-1 text-xs ${s.active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{s.active ? "Active" : "Inactive"}</button>
            <button onClick={() => remove(s.id)} className="rounded-md border border-border p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

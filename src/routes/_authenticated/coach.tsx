import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { chatWithCoach } from "@/lib/coach-chat.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/coach")({
  component: CoachPage,
});

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at: string; citations?: { source: string }[] | null };

function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chat = useServerFn(chatWithCoach);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      let { data: conv } = await supabase.from("ai_conversations").select("id").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!conv) {
        const { data: newConv } = await supabase.from("ai_conversations").insert({ user_id: uid, title: "Coach chat" }).select().single();
        conv = newConv;
      }
      setConversationId(conv!.id);
      const { data: msgs } = await supabase.from("ai_messages").select("*").eq("conversation_id", conv!.id).order("created_at");
      setMessages((msgs ?? []) as Msg[]);
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const suggestions = [
    "What should I train today?",
    "Am I doing too much volume?",
    "Should I increase the weight?",
    "Suggest a substitute for bench press.",
  ];

  async function send(text: string) {
    if (!text.trim() || !conversationId || sending) return;
    setSending(true);
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    try {
      const res = await chat({ data: { conversationId, message: text } });
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: res.reply, created_at: new Date().toISOString(), citations: res.citations ?? null }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The coach is offline";
      toast.error(message);
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${message}`, created_at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <header className="mb-3">
        <h1 className="font-display text-2xl font-black">AI Coach</h1>
        <p className="text-xs text-muted-foreground">Grounded in your program, performance, and vetted training literature.</p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Sparkles className="h-6 w-6 text-primary" /></div>
            <p className="mt-3 text-sm font-medium">Ask me anything about your training.</p>
            <p className="text-xs text-muted-foreground">Programming, progression, technique, recovery.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 border-t border-border/40 pt-2 text-[10px] uppercase tracking-wide opacity-70">
                  Sources: {m.citations.map((c) => c.source).join(" · ")}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && <div className="flex justify-start"><div className="rounded-2xl bg-background px-4 py-2 text-sm text-muted-foreground">Coach is thinking…</div></div>}
        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-primary/50">{s}</button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Ask your coach…"
          rows={1}
          className="min-h-11 resize-none"
        />
        <Button onClick={() => send(input)} disabled={sending || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Educational fitness guidance. Not a substitute for medical care.</p>
    </div>
  );
}

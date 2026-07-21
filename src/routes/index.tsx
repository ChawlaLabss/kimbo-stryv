import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain,
  Dumbbell,
  LineChart,
  MessageSquare,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI Bodybuilding Coach
          </div>
          <h1 className="mt-6 font-display text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl">
            TRAIN SMARTER.<br />
            <span className="text-gradient-red">GET STRONGER.</span><br />
            LIVE BETTER.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Personalized bodybuilding programs, adaptive progression, and AI coaching grounded in real exercise-science literature.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="h-12 px-8 text-base">Start free assessment</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline" className="h-12 px-8 text-base">Sign in</Button></Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Educational fitness guidance. Not a substitute for medical care.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Brain, title: "AI-personalized plans", body: "Built for your goals, experience, schedule, and equipment." },
            { icon: Dumbbell, title: "Adaptive progression", body: "The plan evolves with every logged set, week over week." },
            { icon: LineChart, title: "Real progress tracking", body: "Strength, volume, body-weight, PRs, and photo timeline." },
            { icon: MessageSquare, title: "24/7 AI coach", body: "Ask anything. Grounded in vetted training literature." },
            { icon: Zap, title: "Weekly check-ins", body: "Metrics, soreness, sleep — plans adjust intelligently." },
            { icon: ShieldCheck, title: "Safe and honest", body: "Never trains through pain. No fabricated citations." },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} STRV</span>
          <span>Built for results.</span>
        </div>
      </footer>
    </div>
  );
}

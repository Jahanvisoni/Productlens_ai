import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeTopic } from "@/lib/analyze.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, Loader2, MessageSquare, Users, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Landing,
});

const SUGGESTIONS = ["AI note-taking apps", "Habit tracker apps", "Personal finance tools", "Project management for designers"];

function Landing() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeTopic);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = topic.trim();
    if (t.length < 2) return;
    if (!authed) {
      sessionStorage.setItem("pl_pending_topic", t);
      navigate({ to: "/auth" });
      return;
    }
    setLoading(true);
    try {
      const res = await analyze({ data: { topic: t } });
      navigate({ to: "/results/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      setLoading(false);
    }
  }

  // Auto-run pending topic after auth
  useEffect(() => {
    if (authed) {
      const pending = sessionStorage.getItem("pl_pending_topic");
      if (pending) {
        sessionStorage.removeItem("pl_pending_topic");
        setTopic(pending);
      }
    }
  }, [authed]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" aria-hidden />
        <section className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground mb-8 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Powered by Reddit + AI
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            Turn Reddit Conversations<br />
            into <span className="bg-gradient-primary bg-clip-text text-transparent">PM Insights</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Enter any product topic and get instant user personas, pain points, and PRD-ready summaries.
          </p>

          <form onSubmit={onSubmit} className="mt-10 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-border bg-surface shadow-card">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. AI note-taking apps for students"
                className="flex-1 border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || topic.trim().length < 2} className="bg-gradient-primary shadow-glow h-11 px-6">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing…</> : <>Analyze<ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  disabled={loading}
                  className="text-xs rounded-full border border-border bg-surface-muted px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </form>
        </section>

        <section className="relative mx-auto max-w-5xl px-6 pb-24">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { Icon: Users, title: "User Personas", desc: "Realistic personas synthesized from real conversations." },
              { Icon: MessageSquare, title: "Pain Points", desc: "Ranked frustrations with paraphrased user quotes." },
              { Icon: FileText, title: "PRD Summary", desc: "Problem, goals, features, and success metrics." },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur hover:border-primary/40 transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow mb-4">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

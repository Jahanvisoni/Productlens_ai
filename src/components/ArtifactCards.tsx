import { useMemo, useState } from "react";
import type { Artifacts } from "@/lib/analyze.functions";
import { Users, MessageSquare, FileText, ExternalLink, Copy, Check, LayoutList, AlignLeft } from "lucide-react";

const FREQ_COLOR: Record<string, string> = {
  High: "bg-destructive/20 text-destructive border-destructive/40",
  Medium: "bg-primary/20 text-primary border-primary/40",
  Low: "bg-muted text-muted-foreground border-border",
};

function CopyButton({ getText, label = "Copy" }: { getText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(getText());
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  copyText,
}: {
  icon: typeof Users;
  title: string;
  copyText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Icon className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <CopyButton getText={() => copyText} />
    </div>
  );
}

// ---------- markdown builders ----------
function personasMd(a: Artifacts) {
  return a.personas
    .map(
      (p) =>
        `### ${p.name} — ${p.role}\n\n**Goals**\n${p.goals.map((g) => `- ${g}`).join("\n")}\n\n**Frustrations**\n${p.frustrations.map((f) => `- ${f}`).join("\n")}`,
    )
    .join("\n\n");
}
function painPointsMd(a: Artifacts) {
  return a.painPoints
    .map(
      (p) =>
        `### ${p.title}  _(${p.frequency})_\n${p.description}${
          p.quotes?.length ? `\n\n${p.quotes.map((q) => `> "${q}"`).join("\n")}` : ""
        }`,
    )
    .join("\n\n");
}
function prdMd(a: Artifacts) {
  const { prd } = a;
  return [
    `## PRD Summary`,
    `### Overview\n${prd.overview}`,
    `### Problem\n${prd.problem}`,
    `### Goals\n${prd.goals.map((g) => `- ${g}`).join("\n")}`,
    `### Success Metrics\n${prd.metrics.map((m) => `- ${m}`).join("\n")}`,
    `### Proposed Features\n${prd.features.map((f) => `- **${f.name}** — ${f.description}`).join("\n")}`,
  ].join("\n\n");
}
function fullMd(topic: string, a: Artifacts) {
  const sources = a.sources?.length
    ? `\n\n## Sources\n${a.sources.map((s) => `- [${s.title || s.url}](${s.url})`).join("\n")}`
    : "";
  return `# ${topic}\n\n## User Personas\n${personasMd(a)}\n\n## Pain Points\n${painPointsMd(a)}\n\n${prdMd(a)}${sources}`;
}

export function ArtifactCards({ artifacts, topic }: { artifacts: Artifacts; topic: string }) {
  const [view, setView] = useState<"summary" | "detailed">("summary");
  const fullMarkdown = useMemo(() => fullMd(topic, artifacts), [topic, artifacts]);

  const topPains = artifacts.painPoints
    .slice()
    .sort((a, b) => {
      const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      return (order[a.frequency] ?? 3) - (order[b.frequency] ?? 3);
    })
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Topic</p>
          <h1 className="text-3xl font-semibold tracking-tight">{topic}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5">
            <button
              onClick={() => setView("summary")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                view === "summary" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlignLeft className="h-3.5 w-3.5" /> Summary
            </button>
            <button
              onClick={() => setView("detailed")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                view === "detailed" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Detailed
            </button>
          </div>
          <CopyButton getText={() => fullMarkdown} label="Copy report" />
        </div>
      </div>

      {view === "summary" ? (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">At a glance</h2>
            <CopyButton getText={() => fullMarkdown} label="Copy summary" />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Overview</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{artifacts.prd.overview}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Personas</p>
              <ul className="space-y-1.5 text-sm">
                {artifacts.personas.map((p, i) => (
                  <li key={i}>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground"> — {p.role}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top pain points</p>
              <ul className="space-y-1.5 text-sm">
                {topPains.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 text-[10px] uppercase tracking-wider rounded-full border px-1.5 py-0.5 shrink-0 ${
                        FREQ_COLOR[p.frequency] ?? FREQ_COLOR.Low
                      }`}
                    >
                      {p.frequency}
                    </span>
                    <span>{p.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top goals</p>
              <ul className="space-y-1.5 text-sm list-disc list-inside marker:text-primary">
                {artifacts.prd.goals.slice(0, 4).map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => setView("detailed")}
            className="text-xs text-primary hover:text-primary-glow"
          >
            Show full report →
          </button>
        </section>
      ) : (
        <>
          {/* Personas */}
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <SectionHeader icon={Users} title="User Personas" copyText={personasMd(artifacts)} />
            <div className="grid md:grid-cols-3 gap-4">
              {artifacts.personas.map((p, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface-muted p-5">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-primary mt-0.5">{p.role}</p>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Goals</p>
                    <ul className="space-y-1 text-sm list-disc list-inside marker:text-primary">
                      {p.goals.map((g, j) => (
                        <li key={j} className="text-foreground/90">{g}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Frustrations</p>
                    <ul className="space-y-1 text-sm list-disc list-inside marker:text-destructive">
                      {p.frustrations.map((f, j) => (
                        <li key={j} className="text-foreground/90">{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pain Points */}
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <SectionHeader icon={MessageSquare} title="Pain Points" copyText={painPointsMd(artifacts)} />
            <div className="grid md:grid-cols-2 gap-4">
              {artifacts.painPoints.map((p, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface-muted p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{p.title}</h3>
                    <span
                      className={`text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 shrink-0 ${
                        FREQ_COLOR[p.frequency] ?? FREQ_COLOR.Low
                      }`}
                    >
                      {p.frequency}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                  {p.quotes?.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {p.quotes.map((q, j) => (
                        <p
                          key={j}
                          className="text-xs italic text-foreground/70 border-l-2 border-primary/50 pl-3"
                        >
                          "{q}"
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* PRD */}
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <SectionHeader icon={FileText} title="PRD Summary" copyText={prdMd(artifacts)} />
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Overview</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{artifacts.prd.overview}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Problem</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{artifacts.prd.problem}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Goals</p>
                  <ul className="space-y-1 text-sm list-disc list-inside marker:text-primary">
                    {artifacts.prd.goals.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Success Metrics</p>
                  <ul className="space-y-1 text-sm list-disc list-inside marker:text-primary">
                    {artifacts.prd.metrics.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Proposed Features</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {artifacts.prd.features.map((f, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface-muted p-4">
                      <p className="text-sm font-semibold">{f.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {artifacts.sources?.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/60 p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sources</h2>
          <ul className="space-y-2">
            {artifacts.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:text-primary-glow inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

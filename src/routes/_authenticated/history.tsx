import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listSearches } from "@/lib/searches.functions";
import { AppNav } from "@/components/AppNav";
import { Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const fetchList = useServerFn(listSearches);
  const { data, isLoading } = useQuery({ queryKey: ["searches"], queryFn: () => fetchList() });

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Search history</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">All your past analyses.</p>

        <div className="mt-8 space-y-2">
          {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          {data?.length === 0 && (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">No analyses yet.</p>
              <Link to="/" className="mt-3 inline-block text-sm text-primary hover:text-primary-glow">Start your first one →</Link>
            </div>
          )}
          {data?.map((s) => (
            <Link
              key={s.id}
              to="/results/$id"
              params={{ id: s.id }}
              className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 hover:border-primary/50 transition"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{s.topic}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSearch } from "@/lib/searches.functions";
import { AppNav } from "@/components/AppNav";
import { ArtifactCards } from "@/components/ArtifactCards";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/results/$id")({
  component: ResultsPage,
});

function ResultsPage() {
  const { id } = Route.useParams();
  const fetchSearch = useServerFn(getSearch);
  const { data, isLoading, error } = useQuery({
    queryKey: ["search", id],
    queryFn: () => fetchSearch({ data: { id } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> New analysis
        </Link>
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error && <p className="text-destructive">{(error as Error).message}</p>}
        {data && <ArtifactCards artifacts={data.artifacts} topic={data.topic} />}
      </main>
    </div>
  );
}

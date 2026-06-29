import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Artifacts } from "./analyze.functions";

export const getSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("searches")
      .select("id, topic, artifacts, created_at")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string; topic: string; artifacts: Artifacts; created_at: string };
  });

export const listSearches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("searches")
      .select("id, topic, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data as { id: string; topic: string; created_at: string }[];
  });

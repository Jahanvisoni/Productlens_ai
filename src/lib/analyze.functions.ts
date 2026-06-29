import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({ topic: z.string().trim().min(2).max(200) });

export type Persona = { name: string; role: string; goals: string[]; frustrations: string[] };
export type PainPoint = { title: string; description: string; frequency: "High" | "Medium" | "Low"; quotes: string[] };
export type Artifacts = {
  personas: Persona[];
  painPoints: PainPoint[];
  prd: { overview: string; problem: string; goals: string[]; features: { name: string; description: string }[]; metrics: string[] };
  sources: { title: string; url: string }[];
};

export const analyzeTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const tavilyKey = process.env.TAVILY_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!tavilyKey) throw new Error("Missing TAVILY_API_KEY");
    if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");

    // 1. Search Reddit via Tavily
    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `${data.topic} user experience problems opinions`,
        search_depth: "advanced",
        include_domains: ["reddit.com"],
        max_results: 10,
        include_raw_content: false,
      }),
    });
    if (!tavilyRes.ok) {
      const t = await tavilyRes.text();
      throw new Error(`Tavily error ${tavilyRes.status}: ${t.slice(0, 200)}`);
    }
    const tavily = (await tavilyRes.json()) as {
      results: { title: string; url: string; content: string }[];
    };
    const sources = (tavily.results || []).map((r) => ({ title: r.title, url: r.url }));
    const corpus = (tavily.results || [])
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
      .join("\n\n---\n\n")
      .slice(0, 18000);

    // 2. Ask Gemini for structured PM artifacts
    const systemPrompt = `You are a senior product manager. Given Reddit discussions, extract concrete PM artifacts. Respond ONLY with valid JSON matching this TypeScript type:
{
  "personas": Array<{"name": string, "role": string, "goals": string[], "frustrations": string[]}>, // exactly 3
  "painPoints": Array<{"title": string, "description": string, "frequency": "High" | "Medium" | "Low", "quotes": string[]}>, // 4-6 items, quotes are short paraphrases
  "prd": {
    "overview": string,
    "problem": string,
    "goals": string[],
    "features": Array<{"name": string, "description": string}>, // 4-6 features
    "metrics": string[]
  }
}
No markdown, no commentary — JSON only.`;

    const userPrompt = `Topic: ${data.topic}\n\nReddit discussions:\n${corpus || "(no results found — infer plausible artifacts based on topic)"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
      throw new Error(`AI error ${aiRes.status}: ${t.slice(0, 200)}`);
    }
    const aiJson = (await aiRes.json()) as { choices: { message: { content: string } }[] };
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: Omit<Artifacts, "sources">;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // attempt to recover JSON from any wrapping
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : ({} as never);
    }

    const artifacts: Artifacts = {
      personas: parsed.personas ?? [],
      painPoints: parsed.painPoints ?? [],
      prd: parsed.prd ?? { overview: "", problem: "", goals: [], features: [], metrics: [] },
      sources,
    };

    // 3. Save
    const { data: row, error } = await context.supabase
      .from("searches")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ user_id: context.userId, topic: data.topic, artifacts: artifacts as any })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id as string, artifacts };
  });

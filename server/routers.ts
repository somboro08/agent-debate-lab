import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

const debateSchema = z.object({ projectName: z.string().min(1).max(120), context: z.string().min(10).max(12000), objective: z.string().min(5).max(1000) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  debate: router({
    run: publicProcedure.input(debateSchema).mutation(async ({ input }) => {
      const response = await invokeLLM({
        model: "gpt-5",
        reasoning: { effort: "low" },
        messages: [
          { role: "system", content: `Tu es le moteur d'un jury de deux agents qui travaillent en désaccord constructif. Réponds uniquement avec un JSON valide. Le premier agent, "L'Exploratrice", cherche les besoins réels, les angles morts et les signaux faibles. Le second, "Le Contradicteur", teste les hypothèses, demande des preuves et repère les risques. Après trois tours, "La Présidente" tranche avec un critère de validation concret. Format exact: {"turns":[{"speaker":"string","role":"string","tone":"amber|green|neutral","text":"string"}],"verdict":"string","criterion":"string"}. Les textes sont en français, concis (2 à 4 phrases par tour), sans inventer de données.` },
          { role: "user", content: `Projet: ${input.projectName}\nContexte partagé: ${input.context}\nObjectif à atteindre: ${input.objective}\nFais dialoguer les deux agents puis conclus.` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "jury_debate", strict: true, schema: { type: "object", properties: { turns: { type: "array", items: { type: "object", properties: { speaker: { type: "string" }, role: { type: "string" }, tone: { type: "string", enum: ["amber", "green", "neutral"] }, text: { type: "string" } }, required: ["speaker", "role", "tone", "text"], additionalProperties: false } }, verdict: { type: "string" }, criterion: { type: "string" } }, required: ["turns", "verdict", "criterion"], additionalProperties: false } } },
      });
      const raw = response.choices?.[0]?.message?.content;
      const text = typeof raw === "string" ? raw : raw.map(part => part.type === "text" ? part.text : "").join("");
      return JSON.parse(text) as { turns: Array<{ speaker: string; role: string; tone: string; text: string }>; verdict: string; criterion: string };
    }),
  }),
});

export type AppRouter = typeof appRouter;

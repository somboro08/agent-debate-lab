import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getProjectHistory, saveDebateSession } from "./db";

const debateSchema = z.object({ projectName: z.string().min(1).max(120), context: z.string().min(10).max(12000), objective: z.string().min(5).max(1000) });
const resultSchema = { type: "object", properties: { turns: { type: "array", items: { type: "object", properties: { speaker: { type: "string" }, role: { type: "string" }, tone: { type: "string", enum: ["amber", "green", "neutral", "violet"] }, text: { type: "string" } }, required: ["speaker", "role", "tone", "text"], additionalProperties: false } }, verdict: { type: "string" }, criterion: { type: "string" }, nextStep: { type: "string" } }, required: ["turns", "verdict", "criterion", "nextStep"], additionalProperties: false };

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  debate: router({
    history: publicProcedure.input(z.object({ sessionKey: z.string().min(1) })).query(({ input }) => getProjectHistory(input.sessionKey)),
    save: publicProcedure.input(z.object({ sessionKey: z.string().min(1), name: z.string(), context: z.string(), objective: z.string(), verdict: z.string(), criterion: z.string(), turns: z.array(z.object({ speaker: z.string(), role: z.string(), tone: z.string(), text: z.string() })) })).mutation(({ input }) => saveDebateSession(input)),
    run: publicProcedure.input(debateSchema).mutation(async ({ input }) => {
      const response = await invokeLLM({
        model: "gpt-5", reasoning: { effort: "low" },
        messages: [
          { role: "system", content: `Tu es un orchestrateur de séance de travail avec quatre rôles complémentaires. Réponds uniquement avec un JSON valide. 1) "L'Orchestrateur" reçoit le contexte, reformule l'objectif et distribue les questions. 2) "L'Exploratrice" propose des pistes et des hypothèses. 3) "Le Partenaire" aide, améliore les pistes et ramène doucement la discussion vers l'objectif si elle s'égare. 4) "La Gardienne" vérifie à chaque passage que le travail répond bien à l'objectif, pose des questions de contrôle et signale ce qui manque. Ils ne cherchent pas à se contredire : ils construisent ensemble, posent plusieurs questions et itèrent. Fais 6 à 8 tours courts dans cet ordre naturel, puis fais conclure l'Orchestrateur. Format exact: {"turns":[{"speaker":"string","role":"orchestration|exploration|co-construction|vigilance","tone":"amber|green|neutral|violet","text":"string"}],"verdict":"string","criterion":"string","nextStep":"string"}. Le verdict est une réponse claire à l'objectif. Le criterion est observable. nextStep est la prochaine action concrète. Français, 2 à 4 phrases par tour, aucune donnée inventée.` },
          { role: "user", content: `Projet: ${input.projectName}\nContexte commun: ${input.context}\nObjectif unique à atteindre: ${input.objective}\nOrchestre une séance d'entraide, de recentrage et d'amélioration progressive.` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "collaborative_jury", strict: true, schema: resultSchema } },
      });
      const raw = response.choices?.[0]?.message?.content;
      const text = typeof raw === "string" ? raw : raw.map(part => part.type === "text" ? part.text : "").join("");
      return JSON.parse(text) as { turns: Array<{ speaker: string; role: string; tone: string; text: string }>; verdict: string; criterion: string; nextStep: string };
    }),
  }),
});

export type AppRouter = typeof appRouter;

import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { invokeLLM } from "./llm";
import { ENV } from "./env";
import { saveSessionState } from "../db";

function isPortAvailable(port: number): Promise<boolean> { return new Promise(resolve => { const server = net.createServer(); server.listen(port, () => server.close(() => resolve(true))); server.on("error", () => resolve(false)); }); }
async function findAvailablePort(startPort = 3000): Promise<number> { for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port; throw new Error(`No available port found starting from ${startPort}`); }

type AgentConfig = { name: string; role: string; expertise: string; creativity: number };
const defaultAgents: AgentConfig[] = [
  { name: "L’Orchestrateur", role: "orchestration", expertise: "synthèse et décision", creativity: 60 },
  { name: "L’Exploratrice", role: "exploration", expertise: "besoins et opportunités", creativity: 80 },
  { name: "Le Partenaire", role: "co-construction", expertise: "solutions et amélioration", creativity: 70 },
  { name: "La Gardienne", role: "vigilance", expertise: "alignement et critères", creativity: 40 },
];

async function runStreamingDebate(input: { sessionKey?: string; projectName: string; context: string; objective: string; activeObjective?: number; agents?: AgentConfig[]; existingTranscript?: Array<{ speaker: string; role: string; tone: string; text: string }> }, res: express.Response) {
  const agents = input.agents?.length === 4 ? input.agents : defaultAgents;
  const turns: Array<{ speaker: string; role: string; tone: string; text: string }> = input.existingTranscript ? [...input.existingTranscript] : [];
  const transcript: string[] = turns.map(turn => `${turn.speaker}: ${turn.text}`);
  let disconnected = false;
  let finished = false;
  res.on("close", () => { disconnected = true; if (!finished && input.sessionKey) void saveSessionState({ sessionKey: input.sessionKey, name: input.projectName, context: input.context, status: "interrupted", activeObjective: input.activeObjective ?? 0, agents, transcript: turns }); });
  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const common = `Projet: ${input.projectName}\nContexte commun: ${input.context}\nObjectif unique: ${input.objective}\nAgents: ${agents.map(a => `${a.name} (${a.role}, expertise: ${a.expertise}, créativité ${a.creativity}/100)`).join("; ")}`;
  for (let index = 0; index < 7; index++) {
    if (disconnected) return;
    const agent = agents[index % 4];
    const prompt = index === 0 ? `${common}\nTu es ${agent.name}. Reformule l'objectif et propose la première question de travail.` : `${common}\nConversation déjà produite:\n${transcript.join("\n")}\nTu es ${agent.name}. Réagis au dernier tour en t'entraidant avec les autres. Pose une question utile ou améliore concrètement la piste. Reste strictement centré sur l'objectif.`;
    const response = await invokeLLM({ model: "gpt-5", reasoning: { effort: "low" }, messages: [{ role: "system", content: `Tu es ${agent.name}, rôle ${agent.role}, expert en ${agent.expertise}. Ne contredis pas pour contredire : aide, précise, ramène au but si nécessaire. Réponds uniquement avec JSON {"text":"...","tone":"amber|green|neutral|violet"}. 2 à 4 phrases en français.` }, { role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "debate_turn", strict: true, schema: { type: "object", properties: { text: { type: "string" }, tone: { type: "string", enum: ["amber", "green", "neutral", "violet"] } }, required: ["text", "tone"], additionalProperties: false } } } });
    const raw = response.choices?.[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : raw.map(part => part.type === "text" ? part.text : "").join(""));
    const turn = { speaker: agent.name, role: agent.role, tone: parsed.tone, text: parsed.text };
    turns.push(turn);
    transcript.push(`${agent.name}: ${parsed.text}`);
    send({ type: "turn", index, turn });
    if (input.sessionKey) await saveSessionState({ sessionKey: input.sessionKey, name: input.projectName, context: input.context, status: "running", activeObjective: input.activeObjective ?? 0, agents, transcript: turns });
  }
  if (disconnected) return;
  const finaleResponse = await invokeLLM({ model: "gpt-5", messages: [{ role: "system", content: "Tu es La Gardienne, responsable de la validation finale. Réponds uniquement en JSON {verdict,criterion,nextStep}. verdict doit être une phrase déclarative, compréhensible et directement lisible, sans score, jargon ni chiffres isolés. Elle doit dire ce qui est validé, avec la raison et la preuve disponibles dans les tours. criterion doit être un test observable. nextStep doit être une action concrète. Français." }, { role: "user", content: `${common}\nVoici les tours:\n${transcript.join("\n")}\nValide ou refuse le résultat. Donne une conclusion claire qui commence par une formulation affirmative ou conditionnelle explicite, puis la raison et la preuve.` }], response_format: { type: "json_schema", json_schema: { name: "guardian_finale", strict: true, schema: { type: "object", properties: { verdict: { type: "string" }, criterion: { type: "string" }, nextStep: { type: "string" } }, required: ["verdict", "criterion", "nextStep"], additionalProperties: false } } } });
  const rawFinale = finaleResponse.choices?.[0]?.message?.content;
  const finale = JSON.parse(typeof rawFinale === "string" ? rawFinale : rawFinale.map(part => part.type === "text" ? part.text : "").join(""));
  send({ type: "finale", speaker: agents[3].name, role: "vigilance", ...finale });
  if (input.sessionKey) await saveSessionState({ sessionKey: input.sessionKey, name: input.projectName, context: input.context, status: "completed", activeObjective: input.activeObjective ?? 0, agents, transcript: turns, finale });
  send({ type: "done" }); finished = true; res.end();
}

async function startServer() {
  const app = express(); const server = createServer(app);
  app.use(express.json({ limit: "50mb" })); app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app); registerOAuthRoutes(app);
  app.post("/api/debate/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream"); res.setHeader("Cache-Control", "no-cache"); res.setHeader("Connection", "keep-alive"); res.flushHeaders();
    try { await runStreamingDebate(req.body, res); } catch (error) { if (req.body?.sessionKey) await saveSessionState({ sessionKey: req.body.sessionKey, name: req.body.projectName || "Projet", context: req.body.context || "", status: "interrupted", activeObjective: req.body.activeObjective || 0, agents: req.body.agents, transcript: [] }); res.write(`data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Erreur du moteur" })}\n\n`); res.end(); }
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (process.env.NODE_ENV === "development") await setupVite(app, server); else serveStatic(app);
  const preferredPort = parseInt(process.env.PORT || "3000"); const port = await findAvailablePort(preferredPort); if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`); server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
}
startServer().catch(console.error);

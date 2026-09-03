import { eq, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, objectives, debateMessages } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() { if (!_db && process.env.DATABASE_URL) { try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; } } return _db; }
export async function upsertUser(user: InsertUser): Promise<void> { if (!user.openId) throw new Error("User openId is required for upsert"); const db = await getDb(); if (!db) return; const values: InsertUser = { openId: user.openId }; const updateSet: Record<string, unknown> = {}; for (const field of ["name", "email", "loginMethod"] as const) { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } } values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn; if (user.role || user.openId === ENV.ownerOpenId) { values.role = user.role ?? "admin"; updateSet.role = values.role; } await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet }); }
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }

type SessionState = { sessionKey: string; name: string; context: string; status: "draft" | "running" | "paused" | "interrupted" | "completed"; activeObjective: number; agents?: unknown; transcript?: unknown; finale?: unknown };
export async function saveSessionState(input: SessionState) {
  const db = await getDb(); if (!db) return { persisted: false };
  const serialized = { agents: input.agents ? JSON.stringify(input.agents) : null, transcript: input.transcript ? JSON.stringify(input.transcript) : null, finale: input.finale ? JSON.stringify(input.finale) : null };
  const existing = await db.select().from(projects).where(eq(projects.sessionKey, input.sessionKey)).limit(1);
  if (existing[0]) { await db.update(projects).set({ name: input.name, context: input.context, sessionStatus: input.status, activeObjective: input.activeObjective, ...serialized }).where(eq(projects.id, existing[0].id)); return { persisted: true, projectId: existing[0].id }; }
  const result = await db.insert(projects).values({ sessionKey: input.sessionKey, name: input.name, context: input.context, sessionStatus: input.status, activeObjective: input.activeObjective, ...serialized }); return { persisted: true, projectId: Number(result[0].insertId) };
}
export async function saveDebateSession(input: { sessionKey: string; name: string; context: string; objective: string; verdict: string; criterion: string; turns: Array<{ speaker: string; role: string; tone: string; text: string }> }) {
  const state = await saveSessionState({ sessionKey: input.sessionKey, name: input.name, context: input.context, status: "completed", activeObjective: 0, transcript: input.turns, finale: { verdict: input.verdict, criterion: input.criterion } });
  const db = await getDb(); if (!db || !state.persisted || !state.projectId) return state;
  const objectiveResult = await db.insert(objectives).values({ projectId: state.projectId, position: 1, title: input.objective, status: "completed", verdict: input.verdict, criterion: input.criterion });
  const objectiveId = Number(objectiveResult[0].insertId);
  if (input.turns.length) await db.insert(debateMessages).values(input.turns.map((turn, index) => ({ projectId: state.projectId!, objectiveId, sequence: index, speaker: turn.speaker, role: turn.role, tone: turn.tone, content: turn.text })));
  return { ...state, objectiveId };
}
export async function getProjectHistory(sessionKey: string) { const db = await getDb(); if (!db) return []; const project = await db.select().from(projects).where(eq(projects.sessionKey, sessionKey)).limit(1); if (!project[0]) return []; return db.select().from(objectives).where(eq(objectives.projectId, project[0].id)).orderBy(asc(objectives.position)); }
export async function getProjectState(sessionKey: string) { const db = await getDb(); if (!db) return undefined; const project = await db.select().from(projects).where(eq(projects.sessionKey, sessionKey)).limit(1); if (!project[0]) return undefined; return { ...project[0], agents: project[0].agents ? JSON.parse(project[0].agents) : [], transcript: project[0].transcript ? JSON.parse(project[0].transcript) : [], finale: project[0].finale ? JSON.parse(project[0].finale) : null }; }
export async function listProjects() { const db = await getDb(); if (!db) return []; return db.select({ id: projects.id, sessionKey: projects.sessionKey, name: projects.name, sessionStatus: projects.sessionStatus, activeObjective: projects.activeObjective, createdAt: projects.createdAt, updatedAt: projects.updatedAt }).from(projects).orderBy(desc(projects.updatedAt)); }

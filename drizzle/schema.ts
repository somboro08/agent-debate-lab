import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(), openId: varchar("openId", { length: 64 }).notNull().unique(), name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("loginMethod", { length: 64 }), role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(), sessionKey: varchar("sessionKey", { length: 80 }).notNull().unique(), name: varchar("name", { length: 160 }).notNull(), context: text("context").notNull(), sessionStatus: mysqlEnum("sessionStatus", ["draft", "running", "paused", "interrupted", "completed"]).default("draft").notNull(), activeObjective: int("activeObjective").default(0).notNull(), agents: text("agents"), transcript: text("transcript"), finale: text("finale"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const objectives = mysqlTable("objectives", {
  id: int("id").autoincrement().primaryKey(), projectId: int("projectId").notNull(), position: int("position").notNull(), title: varchar("title", { length: 1000 }).notNull(), status: mysqlEnum("status", ["active", "completed", "pending"]).default("pending").notNull(), verdict: text("verdict"), criterion: text("criterion"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const debateMessages = mysqlTable("debateMessages", {
  id: int("id").autoincrement().primaryKey(), projectId: int("projectId").notNull(), objectiveId: int("objectiveId").notNull(), sequence: int("sequence").notNull(), speaker: varchar("speaker", { length: 160 }).notNull(), role: varchar("role", { length: 80 }).notNull(), tone: varchar("tone", { length: 30 }).notNull(), content: text("content").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect; export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect; export type Objective = typeof objectives.$inferSelect; export type DebateMessage = typeof debateMessages.$inferSelect;

import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { getProjectHistory, saveDebateSession } from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getProjectHistory: vi.fn(),
  saveDebateSession: vi.fn(),
}));

const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("debate persistence", () => {
  it("saves a completed objective and its transcript", async () => {
    vi.mocked(saveDebateSession).mockResolvedValueOnce({ persisted: true, projectId: 4, objectiveId: 8 });
    const result = await appRouter.createCaller(ctx).debate.save({
      sessionKey: "session-test",
      name: "Projet test",
      context: "Contexte de test suffisamment long.",
      objective: "Valider une hypothèse",
      verdict: "Hypothèse cadrée",
      criterion: "Trois retours concordants",
      turns: [{ speaker: "La Gardienne", role: "vigilance", tone: "green", text: "Le critère est observable." }],
    });
    expect(result).toEqual({ persisted: true, projectId: 4, objectiveId: 8 });
    expect(saveDebateSession).toHaveBeenCalledOnce();
  });

  it("returns saved objectives for the session history", async () => {
    vi.mocked(getProjectHistory).mockResolvedValueOnce([{ id: 8, projectId: 4, position: 1, title: "Valider une hypothèse", status: "completed", verdict: "OK", criterion: "Test", createdAt: new Date() }]);
    const result = await appRouter.createCaller(ctx).debate.history({ sessionKey: "session-test" });
    expect(result[0]?.title).toBe("Valider une hypothèse");
    expect(getProjectHistory).toHaveBeenCalledWith("session-test");
  });
});

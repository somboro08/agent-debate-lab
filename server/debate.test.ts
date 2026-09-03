import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { invokeLLM } from "./_core/llm";
import type { TrpcContext } from "./_core/context";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

const mockedInvokeLLM = vi.mocked(invokeLLM);
const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("debate.run", () => {
  it("returns the jury turns and verdict from the structured model response", async () => {
    mockedInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { role: "assistant", content: JSON.stringify({
        turns: [
          { speaker: "L'Exploratrice", role: "exploration", tone: "amber", text: "Quel besoin précis observons-nous ?" },
          { speaker: "Le Contradicteur", role: "stress-test", tone: "neutral", text: "Quelle preuve permet de l'affirmer ?" },
          { speaker: "La Présidente", role: "verdict", tone: "green", text: "Le problème est suffisamment cadré." },
        ],
        verdict: "Le problème est exploitable.",
        criterion: "Trois entretiens confirment la même friction prioritaire.",
      }) }, index: 0, finish_reason: "stop" }],
      id: "test", created: 0, model: "gpt-5",
    });

    const result = await appRouter.createCaller(ctx).debate.run({
      projectName: "Atelier Produit",
      context: "Une équipe veut tester une idée sans perdre le problème de départ.",
      objective: "Établir un problème clair à résoudre",
    });

    expect(result.turns).toHaveLength(3);
    expect(result.verdict).toContain("exploitable");
    expect(result.criterion).toContain("entretiens");
    expect(mockedInvokeLLM).toHaveBeenCalledOnce();
  });

  it("rejects an empty objective before calling the model", async () => {
    mockedInvokeLLM.mockClear();
    await expect(appRouter.createCaller(ctx).debate.run({
      projectName: "Atelier Produit",
      context: "Un contexte suffisamment long pour le test.",
      objective: "",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
  });
});

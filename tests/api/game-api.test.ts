import { beforeEach, describe, expect, it, vi } from "vitest";

const writeSessionMock = vi.fn();
const readSessionMock = vi.fn();

vi.mock("@/lib/session", () => ({
  writeSession: writeSessionMock,
  readSession: readSessionMock,
}));

describe("game APIs", () => {
  beforeEach(() => {
    writeSessionMock.mockReset();
    readSessionMock.mockReset();
  });

  it("rejects invalid new game difficulty", async () => {
    const { POST } = await import("@/app/api/game/new/route");
    const request = new Request("http://localhost/api/game/new", {
      method: "POST",
      body: JSON.stringify({ difficulty: "impossible" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("creates a new game session", async () => {
    const { POST } = await import("@/app/api/game/new/route");
    const request = new Request("http://localhost/api/game/new", {
      method: "POST",
      body: JSON.stringify({ difficulty: "easy" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = (await response.json()) as { gameId: string; maxRounds: number };

    expect(response.status).toBe(200);
    expect(body.gameId).toBeTruthy();
    expect(body.maxRounds).toBe(8);
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate guess", async () => {
    const { POST } = await import("@/app/api/game/guess/route");
    readSessionMock.mockResolvedValue({
      gameId: "g1",
      difficulty: "normal",
      targetPlayerId: "2544",
      maxRounds: 8,
      guessPlayerIds: ["201939"],
      status: "ongoing",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const request = new Request("http://localhost/api/game/guess", {
      method: "POST",
      body: JSON.stringify({ gameId: "g1", playerId: "201939" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});


import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDifficultyPool, randomPlayerFromPool } from "@/lib/data";
import { writeSession } from "@/lib/session";
import type { Difficulty, GameSession } from "@/lib/types";

const bodySchema = z.object({
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
});

const MAX_ROUNDS = 8;

export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 });
  }

  const difficulty = parsed.data.difficulty as Difficulty;
  const pool = getDifficultyPool(difficulty);
  if (pool.length === 0) {
    return NextResponse.json({ error: "No players available for this mode." }, { status: 400 });
  }

  const target = randomPlayerFromPool(difficulty);
  const now = new Date().toISOString();
  const session: GameSession = {
    gameId: randomUUID(),
    difficulty,
    targetPlayerId: target.playerId,
    maxRounds: MAX_ROUNDS,
    guessPlayerIds: [],
    status: "ongoing",
    startedAt: now,
    updatedAt: now,
  };
  await writeSession(session);

  return NextResponse.json({
    gameId: session.gameId,
    maxRounds: session.maxRounds,
    difficulty: session.difficulty,
    poolSize: pool.length,
  });
}



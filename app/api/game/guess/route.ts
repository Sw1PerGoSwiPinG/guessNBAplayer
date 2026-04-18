import { NextResponse } from "next/server";
import { z } from "zod";
import { getDifficultyPool, getPlayerById } from "@/lib/data";
import { buildGuessFeedback } from "@/lib/game-engine";
import { readSession, writeSession } from "@/lib/session";
import type { Difficulty } from "@/lib/types";

const bodySchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid guess request." }, { status: 400 });
  }

  const session = await readSession();
  if (!session || session.gameId !== parsed.data.gameId) {
    return NextResponse.json({ error: "No active game session." }, { status: 400 });
  }
  if (session.status !== "ongoing") {
    return NextResponse.json({ error: "This game has already finished." }, { status: 400 });
  }

  const guessed = getPlayerById(parsed.data.playerId);
  if (!guessed) {
    return NextResponse.json({ error: "Unknown player." }, { status: 400 });
  }

  const poolIds = new Set(getDifficultyPool(session.difficulty as Difficulty).map((player) => player.playerId));
  if (!poolIds.has(guessed.playerId)) {
    return NextResponse.json({ error: "Player not available in current difficulty pool." }, { status: 400 });
  }

  if (session.guessPlayerIds.includes(guessed.playerId)) {
    return NextResponse.json({ error: "You already guessed this player." }, { status: 400 });
  }

  const feedback = buildGuessFeedback(guessed.playerId, session.targetPlayerId);
  session.guessPlayerIds.push(guessed.playerId);
  const used = session.guessPlayerIds.length;
  const won = feedback.isCorrect;
  const lost = !won && used >= session.maxRounds;
  session.status = won ? "won" : lost ? "lost" : "ongoing";
  session.updatedAt = new Date().toISOString();
  await writeSession(session);

  const revealedTarget = session.status === "lost" ? (getPlayerById(session.targetPlayerId) ?? null) : null;

  return NextResponse.json({
    gameId: session.gameId,
    status: session.status,
    roundsUsed: used,
    roundsLeft: Math.max(session.maxRounds - used, 0),
    feedback,
    guessedPlayer: {
      playerId: guessed.playerId,
      enName: guessed.enName,
      zhName: guessed.zhName,
      team: guessed.team,
      jersey: guessed.jersey,
      position: guessed.position,
      country: guessed.country,
      draftYear: guessed.draftYear,
      draftPick: guessed.draftPick,
      heightCm: guessed.heightCm,
      careerYears: guessed.careerYears,
      ppg: guessed.ppg,
      playoffAppearances: guessed.playoffAppearances,
    },
    target:
      revealedTarget === null
        ? null
        : {
            playerId: revealedTarget.playerId,
            enName: revealedTarget.enName,
            zhName: revealedTarget.zhName,
          },
  });
}



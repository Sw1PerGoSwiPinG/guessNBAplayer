import { NextResponse } from "next/server";
import { z } from "zod";
import { searchPlayers } from "@/lib/search";

const querySchema = z.object({
  q: z.string().trim().min(1).max(40),
});

/** Search API for player picker dropdown. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  // Invalid query returns empty list instead of error for smoother UX.
  if (!parsed.success) {
    return NextResponse.json({ items: [] });
  }

  const players = searchPlayers(parsed.data.q).map((player) => ({
    playerId: player.playerId,
    enName: player.enName,
    zhName: player.zhName,
    team: player.team,
    position: player.position,
  }));

  return NextResponse.json({ items: players });
}

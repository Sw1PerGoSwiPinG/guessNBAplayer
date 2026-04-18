import { getAllPlayers } from "@/lib/data";
import type { Player } from "@/lib/types";

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, "").trim();
}

function scorePlayer(player: Player, query: string): number {
  const q = normalize(query);
  if (!q) return 0;

  const keys = [player.enName, player.zhName, ...player.aliases].map(normalize);
  if (keys.includes(q)) return 100;
  if (keys.some((key) => key.startsWith(q))) return 70;
  if (keys.some((key) => key.includes(q))) return 45;
  return 0;
}

export function searchPlayers(query: string, limit = 8): Player[] {
  const scored = getAllPlayers()
    .map((player) => ({ player, score: scorePlayer(player, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.player.enName.localeCompare(b.player.enName));
  return scored.slice(0, limit).map((entry) => entry.player);
}



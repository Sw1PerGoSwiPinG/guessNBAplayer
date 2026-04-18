import seasons from "@/data/seasons.json";
import playerCnOverrides from "@/data/player-cn-overrides.json";
import rawPlayers from "@/data/players.2025-26.json";
import type { Difficulty, Player, SeasonConfig } from "@/lib/types";

const seasonConfig = seasons as SeasonConfig;
const overrides = playerCnOverrides as Record<string, { zhName?: string; aliases?: string[] }>;

function normalizeEnName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

const overrideMap = new Map<string, { zhName?: string; aliases?: string[] }>();
for (const [name, value] of Object.entries(overrides)) {
  overrideMap.set(normalizeEnName(name), value);
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}

function withOverrides(input: Player[]): Player[] {
  return input.map((player) => {
    const override = overrideMap.get(normalizeEnName(player.enName));
    if (!override) return player;

    const aliasSet = new Set<string>();
    for (const alias of player.aliases ?? []) {
      if (alias.trim()) aliasSet.add(alias.trim());
    }
    for (const alias of override.aliases ?? []) {
      if (alias.trim()) aliasSet.add(alias.trim());
    }
    aliasSet.add(player.enName);
    if (override.zhName?.trim()) aliasSet.add(override.zhName.trim());
    if (player.zhName?.trim()) aliasSet.add(player.zhName.trim());

    const dedupedAliases = Array.from(aliasSet);
    dedupedAliases.sort((a, b) => normalizeAlias(a).localeCompare(normalizeAlias(b)));

    return {
      ...player,
      zhName: override.zhName?.trim() || player.zhName,
      aliases: dedupedAliases,
    };
  });
}

const players = withOverrides(rawPlayers as Player[]);

const difficultyMinMpg: Record<Difficulty, number> = {
  easy: 25,
  normal: 20,
  hard: 15,
};

export function getActiveSeason(): string {
  return seasonConfig.activeSeason;
}

export function getAllPlayers(season = getActiveSeason()): Player[] {
  return players.filter((player) => player.activeInSeason === season);
}

export function getPlayerById(playerId: string): Player | undefined {
  return players.find((player) => player.playerId === playerId);
}

export function getDifficultyPool(difficulty: Difficulty): Player[] {
  const minMpg = difficultyMinMpg[difficulty];
  return getAllPlayers().filter((player) => (player.mpg ?? 0) >= minMpg);
}

export function getDifficultyThreshold(difficulty: Difficulty): number {
  return difficultyMinMpg[difficulty];
}

export function randomPlayerFromPool(difficulty: Difficulty): Player {
  const pool = getDifficultyPool(difficulty);
  if (pool.length === 0) {
    throw new Error(`No players found for difficulty "${difficulty}".`);
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}



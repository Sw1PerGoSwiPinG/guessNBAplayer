export type Difficulty = "easy" | "normal" | "hard";

export type PositionGroup = "guard" | "wing" | "big" | "unknown";

export interface Player {
  playerId: string;
  enName: string;
  zhName: string;
  aliases: string[];
  team: string;
  jersey: string;
  position: string;
  age: number | null;
  heightCm: number | null;
  country: string;
  draftYear: number | null;
  draftPick: number | null;
  ppg: number | null;
  apg: number | null;
  rpg: number | null;
  playoffAppearances: number | null;
  mpg: number | null;
  activeInSeason: string;
}

export interface SeasonConfig {
  activeSeason: string;
  seasons: string[];
}

export interface ValueFeedback {
  status: "exact" | "near" | "close" | "far" | "unknown";
  direction?: "up" | "down";
}

export interface GuessFeedback {
  guessedPlayerId: string;
  guessedName: string;
  isCorrect: boolean;
  team: ValueFeedback;
  jersey: ValueFeedback;
  position: ValueFeedback;
  country: ValueFeedback;
  draftYear: ValueFeedback;
  draftPick: ValueFeedback;
  age: ValueFeedback;
  heightCm: ValueFeedback;
  ppg: ValueFeedback;
  playoffAppearances: ValueFeedback;
}

export interface GameSession {
  gameId: string;
  difficulty: Difficulty;
  targetPlayerId: string;
  maxRounds: number;
  guessPlayerIds: string[];
  status: "ongoing" | "won" | "lost";
  startedAt: string;
  updatedAt: string;
}


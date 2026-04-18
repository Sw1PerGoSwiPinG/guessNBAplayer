import { getPlayerById } from "@/lib/data";
import type { GuessFeedback, Player, PositionGroup, ValueFeedback } from "@/lib/types";

const EXACT: ValueFeedback = { status: "exact" };
const UNKNOWN: ValueFeedback = { status: "unknown" };

const THRESHOLDS = {
  heightCm: { near: 2, close: 6 },
  careerYears: { near: 1, close: 3 },
  ppg: { near: 1.5, close: 4 },
  playoffAppearances: { near: 1, close: 3 },
  draftPick: { near: 3, close: 10 },
  draftYear: { near: 1, close: 3 },
};

function groupPosition(position: string): PositionGroup {
  const value = position.toUpperCase();
  if (value.includes("PG") || value.includes("SG") || value === "G") return "guard";
  if (value.includes("SF") || value.includes("F")) return "wing";
  if (value.includes("PF") || value.includes("C") || value === "FC") return "big";
  return "unknown";
}

function compareExact(a: string | number | null, b: string | number | null): ValueFeedback {
  if (a === null || b === null || a === "" || b === "") return UNKNOWN;
  return a === b ? EXACT : { status: "far" };
}

function comparePosition(guess: Player, target: Player): ValueFeedback {
  if (!guess.position || !target.position) return UNKNOWN;
  if (guess.position === target.position) return EXACT;
  return groupPosition(guess.position) === groupPosition(target.position)
    ? { status: "close" }
    : { status: "far" };
}

function compareNumeric(
  guessValue: number | null,
  targetValue: number | null,
  nearThreshold: number,
  closeThreshold: number,
): ValueFeedback {
  if (guessValue === null || targetValue === null) return UNKNOWN;
  if (guessValue === targetValue) return EXACT;

  const delta = Math.abs(guessValue - targetValue);
  const direction = guessValue < targetValue ? "up" : "down";

  if (delta <= nearThreshold) return { status: "near", direction };
  if (delta <= closeThreshold) return { status: "close", direction };
  return { status: "far", direction };
}

export function buildGuessFeedback(guessPlayerId: string, targetPlayerId: string): GuessFeedback {
  const guess = getPlayerById(guessPlayerId);
  const target = getPlayerById(targetPlayerId);
  if (!guess || !target) {
    throw new Error("Invalid player for feedback comparison.");
  }

  return {
    guessedPlayerId: guess.playerId,
    guessedName: guess.enName,
    isCorrect: guess.playerId === target.playerId,
    team: compareExact(guess.team, target.team),
    jersey: compareExact(guess.jersey, target.jersey),
    position: comparePosition(guess, target),
    country: compareExact(guess.country, target.country),
    draftYear: compareNumeric(guess.draftYear, target.draftYear, THRESHOLDS.draftYear.near, THRESHOLDS.draftYear.close),
    draftPick: compareNumeric(guess.draftPick, target.draftPick, THRESHOLDS.draftPick.near, THRESHOLDS.draftPick.close),
    heightCm: compareNumeric(guess.heightCm, target.heightCm, THRESHOLDS.heightCm.near, THRESHOLDS.heightCm.close),
    careerYears: compareNumeric(
      guess.careerYears,
      target.careerYears,
      THRESHOLDS.careerYears.near,
      THRESHOLDS.careerYears.close,
    ),
    ppg: compareNumeric(guess.ppg, target.ppg, THRESHOLDS.ppg.near, THRESHOLDS.ppg.close),
    playoffAppearances: compareNumeric(
      guess.playoffAppearances,
      target.playoffAppearances,
      THRESHOLDS.playoffAppearances.near,
      THRESHOLDS.playoffAppearances.close,
    ),
  };
}



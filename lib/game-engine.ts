import { getPlayerById } from "@/lib/data";
import type { GuessFeedback, Player, PositionGroup, ValueFeedback } from "@/lib/types";

const EXACT: ValueFeedback = { status: "exact" };
const UNKNOWN: ValueFeedback = { status: "unknown" };

const THRESHOLDS = {
  jersey: { near: 1, close: 3 },
  age: { near: 1, close: 3 },
  heightCm: { near: 2, close: 6 },
  ppg: { near: 1.5, close: 4 },
  playoffAppearances: { near: 1, close: 3 },
  draftPick: { near: 3, close: 10 },
  draftYear: { near: 1, close: 3 },
};

const TEAM_DIVISION: Record<string, "northwest" | "pacific" | "southwest" | "atlantic" | "central" | "southeast"> = {
  // Northwest
  DEN: "northwest",
  MIN: "northwest",
  OKC: "northwest",
  POR: "northwest",
  UTA: "northwest",
  // Pacific
  GSW: "pacific",
  LAC: "pacific",
  LAL: "pacific",
  PHX: "pacific",
  SAC: "pacific",
  // Southwest
  DAL: "southwest",
  HOU: "southwest",
  MEM: "southwest",
  NOP: "southwest",
  SAS: "southwest",
  // Atlantic
  BOS: "atlantic",
  BKN: "atlantic",
  NYK: "atlantic",
  PHI: "atlantic",
  TOR: "atlantic",
  // Central
  CHI: "central",
  CLE: "central",
  DET: "central",
  IND: "central",
  MIL: "central",
  // Southeast
  ATL: "southeast",
  CHA: "southeast",
  MIA: "southeast",
  ORL: "southeast",
  WAS: "southeast",
};

const COUNTRY_CONTINENT: Record<string, "africa" | "asia" | "europe" | "north_america" | "south_america" | "oceania"> = {
  Australia: "oceania",
  Austria: "europe",
  Bahamas: "north_america",
  Belgium: "europe",
  "Bosnia and Herzegovina": "europe",
  Brazil: "south_america",
  Cameroon: "africa",
  Canada: "north_america",
  China: "asia",
  Croatia: "europe",
  "Czech Republic": "europe",
  DRC: "africa",
  "Dominican Republic": "north_america",
  Finland: "europe",
  France: "europe",
  Georgia: "europe",
  Germany: "europe",
  Greece: "europe",
  Guinea: "africa",
  Haiti: "north_america",
  Israel: "asia",
  Italy: "europe",
  Jamaica: "north_america",
  Japan: "asia",
  Latvia: "europe",
  Lithuania: "europe",
  Mali: "africa",
  Montenegro: "europe",
  Netherlands: "europe",
  "New Zealand": "oceania",
  Nicaragua: "north_america",
  Nigeria: "africa",
  Poland: "europe",
  Portugal: "europe",
  "Puerto Rico": "north_america",
  Russia: "europe",
  "Saint Lucia": "north_america",
  Senegal: "africa",
  Serbia: "europe",
  Slovenia: "europe",
  "South Sudan": "africa",
  Spain: "europe",
  Sweden: "europe",
  Switzerland: "europe",
  Turkey: "asia",
  USA: "north_america",
  Ukraine: "europe",
  "United Kingdom": "europe",
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

function compareTeamByDivision(guessTeam: string, targetTeam: string): ValueFeedback {
  if (!guessTeam || !targetTeam) return UNKNOWN;
  if (guessTeam === targetTeam) return EXACT;
  const guessDivision = TEAM_DIVISION[guessTeam];
  const targetDivision = TEAM_DIVISION[targetTeam];
  if (!guessDivision || !targetDivision) return { status: "far" };
  return guessDivision === targetDivision ? { status: "close" } : { status: "far" };
}

function compareCountryByContinent(guessCountry: string, targetCountry: string): ValueFeedback {
  if (!guessCountry || !targetCountry) return UNKNOWN;
  if (guessCountry === targetCountry) return EXACT;
  const guessContinent = COUNTRY_CONTINENT[guessCountry];
  const targetContinent = COUNTRY_CONTINENT[targetCountry];
  if (!guessContinent || !targetContinent) return { status: "far" };
  return guessContinent === targetContinent ? { status: "close" } : { status: "far" };
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

function parseJerseyNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function buildGuessFeedback(guessPlayerId: string, targetPlayerId: string): GuessFeedback {
  const guess = getPlayerById(guessPlayerId);
  const target = getPlayerById(targetPlayerId);
  if (!guess || !target) {
    throw new Error("Invalid player for feedback comparison.");
  }
  const guessedJersey = parseJerseyNumber(guess.jersey);
  const targetJersey = parseJerseyNumber(target.jersey);

  return {
    guessedPlayerId: guess.playerId,
    guessedName: guess.enName,
    isCorrect: guess.playerId === target.playerId,
    team: compareTeamByDivision(guess.team, target.team),
    jersey:
      guessedJersey !== null && targetJersey !== null
        ? compareNumeric(guessedJersey, targetJersey, THRESHOLDS.jersey.near, THRESHOLDS.jersey.close)
        : compareExact(guess.jersey, target.jersey),
    position: comparePosition(guess, target),
    country: compareCountryByContinent(guess.country, target.country),
    draftYear: compareNumeric(guess.draftYear, target.draftYear, THRESHOLDS.draftYear.near, THRESHOLDS.draftYear.close),
    draftPick: compareNumeric(guess.draftPick, target.draftPick, THRESHOLDS.draftPick.near, THRESHOLDS.draftPick.close),
    age: compareNumeric(guess.age, target.age, THRESHOLDS.age.near, THRESHOLDS.age.close),
    heightCm: compareNumeric(guess.heightCm, target.heightCm, THRESHOLDS.heightCm.near, THRESHOLDS.heightCm.close),
    ppg: compareNumeric(guess.ppg, target.ppg, THRESHOLDS.ppg.near, THRESHOLDS.ppg.close),
    playoffAppearances: compareNumeric(
      guess.playoffAppearances,
      target.playoffAppearances,
      THRESHOLDS.playoffAppearances.near,
      THRESHOLDS.playoffAppearances.close,
    ),
  };
}



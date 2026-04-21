"use client";

import { Check, CircleHelp, RotateCcw, Search, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "normal" | "hard";
type Status = "ongoing" | "won" | "lost";
type FeedbackStatus = "exact" | "near" | "close" | "far" | "unknown";

type FieldKey =
  | "team"
  | "jersey"
  | "position"
  | "age"
  | "country"
  | "draftYear"
  | "draftPick"
  | "heightCm"
  | "ppg"
  | "playoffAppearances";

interface SearchItem {
  playerId: string;
  enName: string;
  zhName: string;
  team: string;
  position: string;
}

interface ValueFeedback {
  status: FeedbackStatus;
  direction?: "up" | "down";
}

interface GuessFeedback {
  guessedPlayerId: string;
  guessedName: string;
  isCorrect: boolean;
  team: ValueFeedback;
  jersey: ValueFeedback;
  position: ValueFeedback;
  age: ValueFeedback;
  country: ValueFeedback;
  draftYear: ValueFeedback;
  draftPick: ValueFeedback;
  heightCm: ValueFeedback;
  ppg: ValueFeedback;
  playoffAppearances: ValueFeedback;
}

interface GuessedPlayer {
  playerId: string;
  enName: string;
  zhName: string;
  team: string;
  jersey: string;
  position: string;
  age: number | null;
  country: string;
  draftYear: number | null;
  draftPick: number | null;
  heightCm: number | null;
  ppg: number | null;
  playoffAppearances: number | null;
  gamesPlayed: number | null;
}

interface GuessResult {
  status: Status;
  roundsUsed: number;
  roundsLeft: number;
  feedback: GuessFeedback;
  guessedPlayer: GuessedPlayer;
  target: { playerId: string; enName: string; zhName: string } | null;
}

interface GuessHistory {
  feedback: GuessFeedback;
  player: GuessedPlayer;
}

const difficultyLabels: Record<Difficulty, string> = {
  easy: "简单模式",
  normal: "普通模式",
  hard: "困难模式",
};

const fieldLabels: Record<FieldKey, string> = {
  team: "队伍",
  jersey: "球衣号码",
  position: "司职位置",
  age: "年龄",
  country: "国家",
  draftYear: "选秀年份",
  draftPick: "选秀顺位",
  heightCm: "身高",
  ppg: "场均得分",
  playoffAppearances: "季后赛次数",
};

const teamDivisionLabelByAbbr: Record<string, string> = {
  DEN: "西北赛区",
  MIN: "西北赛区",
  OKC: "西北赛区",
  POR: "西北赛区",
  UTA: "西北赛区",
  GSW: "太平洋赛区",
  LAC: "太平洋赛区",
  LAL: "太平洋赛区",
  PHX: "太平洋赛区",
  SAC: "太平洋赛区",
  DAL: "西南赛区",
  HOU: "西南赛区",
  MEM: "西南赛区",
  NOP: "西南赛区",
  SAS: "西南赛区",
  BOS: "大西洋赛区",
  BKN: "大西洋赛区",
  NYK: "大西洋赛区",
  PHI: "大西洋赛区",
  TOR: "大西洋赛区",
  CHI: "中部赛区",
  CLE: "中部赛区",
  DET: "中部赛区",
  IND: "中部赛区",
  MIL: "中部赛区",
  ATL: "东南赛区",
  CHA: "东南赛区",
  MIA: "东南赛区",
  ORL: "东南赛区",
  WAS: "东南赛区",
};

const continentLabelByCountry: Record<string, string> = {
  Australia: "大洋洲",
  Austria: "欧洲",
  Bahamas: "北美洲",
  Belgium: "欧洲",
  "Bosnia and Herzegovina": "欧洲",
  Brazil: "南美洲",
  Cameroon: "非洲",
  Canada: "北美洲",
  China: "亚洲",
  Croatia: "欧洲",
  "Czech Republic": "欧洲",
  DRC: "非洲",
  "Dominican Republic": "北美洲",
  Finland: "欧洲",
  France: "欧洲",
  Georgia: "欧洲",
  Germany: "欧洲",
  Greece: "欧洲",
  Guinea: "非洲",
  Haiti: "北美洲",
  Israel: "亚洲",
  Italy: "欧洲",
  Jamaica: "北美洲",
  Japan: "亚洲",
  Latvia: "欧洲",
  Lithuania: "欧洲",
  Mali: "非洲",
  Montenegro: "欧洲",
  Netherlands: "欧洲",
  "New Zealand": "大洋洲",
  Nicaragua: "北美洲",
  Nigeria: "非洲",
  Poland: "欧洲",
  Portugal: "欧洲",
  "Puerto Rico": "北美洲",
  Russia: "欧洲",
  "Saint Lucia": "北美洲",
  Senegal: "非洲",
  Serbia: "欧洲",
  Slovenia: "欧洲",
  "South Sudan": "非洲",
  Spain: "欧洲",
  Sweden: "欧洲",
  Switzerland: "欧洲",
  Turkey: "亚洲",
  USA: "北美洲",
  Ukraine: "欧洲",
  "United Kingdom": "欧洲",
};

const fieldColClass: Record<FieldKey, string> = {
  team: "w-[7%]",
  jersey: "w-[8%]",
  position: "w-[8%]",
  age: "w-[7%]",
  country: "w-[7%]",
  draftYear: "w-[8%]",
  draftPick: "w-[8%]",
  heightCm: "w-[8%]",
  ppg: "w-[7%]",
  playoffAppearances: "w-[9%]",
};

const feedbackClass: Record<FeedbackStatus, string> = {
  exact: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]",
  near: "bg-lime-500/20 text-lime-200 border-lime-300/55",
  close: "bg-sky-500/20 text-sky-200 border-sky-400/55",
  far: "bg-rose-500/20 text-rose-200 border-rose-300/55",
  unknown: "bg-zinc-500/20 text-zinc-200 border-zinc-300/45",
};

const fields: FieldKey[] = [
  "team",
  "jersey",
  "position",
  "age",
  "country",
  "draftYear",
  "draftPick",
  "heightCm",
  "ppg",
  "playoffAppearances",
];

const numericFields = new Set<FieldKey>(["jersey", "age", "draftYear", "draftPick", "heightCm", "ppg", "playoffAppearances"]);

const numericRule: Record<
  "jersey" | "age" | "draftYear" | "draftPick" | "heightCm" | "ppg" | "playoffAppearances",
  { decimals: number }
> = {
  jersey: { decimals: 0 },
  age: { decimals: 0 },
  draftYear: { decimals: 0 },
  draftPick: { decimals: 0 },
  heightCm: { decimals: 0 },
  ppg: { decimals: 1 },
  playoffAppearances: { decimals: 0 },
};

/** Build official NBA headshot URL from playerId. */
function buildHeadshotUrl(playerId: string): string {
  return `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/520x380/${playerId}.png`;
}

/** Format numeric clue value with field-specific precision. */
function formatValue(value: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

/** Parse jersey string into integer when possible. */
function parseJersey(value: string): number | null {
  const v = value.trim();
  if (!/^\d+$/.test(v)) return null;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

/** Use human-friendly wording for selected single-bound clues. */
function formatSingleBoundClue(
  key: "jersey" | "age" | "draftYear" | "draftPick" | "heightCm" | "ppg" | "playoffAppearances",
  bound: "lower" | "upper",
  value: number,
  decimals: number,
): string {
  const text = formatValue(value, decimals);
  if (key === "draftYear") {
    return bound === "upper" ? `${text} 之前` : `${text} 之后`;
  }
  if (key === "draftPick") {
    return bound === "upper" ? `高于 ${text}` : `低于 ${text}`;
  }
  return bound === "upper" ? `< ${text}` : `> ${text}`;
}

/**
 * Infer a numeric target range from feedback history.
 * It aggregates up/down hints into lower/upper bounds.
 */
function inferNumericRange(
  rows: GuessHistory[],
  key: "jersey" | "age" | "draftYear" | "draftPick" | "heightCm" | "ppg" | "playoffAppearances",
): string {
  const rule = numericRule[key];
  let lower: number | null = null;
  let upper: number | null = null;

  for (const row of rows) {
    const feedback = row.feedback[key as FieldKey];
    if (feedback.status === "unknown") continue;

    // exact feedback short-circuits range inference.
    if (feedback.status === "exact") {
      if (key === "jersey") {
        const jerseyExact = row.player.jersey?.trim();
        if (jerseyExact) return jerseyExact;
      }
      const exactValue = row.player[key];
      if (exactValue !== null) return formatValue(Number(exactValue), rule.decimals);
      continue;
    }

    const guessedValue = key === "jersey" ? parseJersey(row.player.jersey) : row.player[key];

    if (guessedValue === null || !feedback.direction) continue;

    // up/down indicates target is bigger/smaller than current guess.
    if (feedback.direction === "up") {
      lower = lower === null ? guessedValue : Math.max(lower, guessedValue);
    }

    if (feedback.direction === "down") {
      upper = upper === null ? guessedValue : Math.min(upper, guessedValue);
    }
  }

  if (lower !== null && upper !== null) {
    if (lower < upper) return `${formatValue(lower, rule.decimals)} < ~ < ${formatValue(upper, rule.decimals)}`;
    if (lower === upper) return formatValue(lower, rule.decimals);
    return "范围冲突";
  }

  if (lower !== null) return formatSingleBoundClue(key, "lower", lower, rule.decimals);
  if (upper !== null) return formatSingleBoundClue(key, "upper", upper, rule.decimals);
  return "?";
}

/** Infer one pinned clue text for top summary area. */
function inferPinnedValue(rows: GuessHistory[], key: FieldKey): string {
  if (rows.length === 0) return "?";

  // Numeric fields use range inference instead of single-value matching.
  if (["jersey", "age", "draftYear", "draftPick", "heightCm", "ppg", "playoffAppearances"].includes(key)) {
    return inferNumericRange(
      rows,
      key as "jersey" | "age" | "draftYear" | "draftPick" | "heightCm" | "ppg" | "playoffAppearances",
    );
  }

  for (const row of rows) {
    const feedback = row.feedback[key];
    if (feedback.status === "exact") {
      const value = row.player[key as keyof GuessedPlayer];
      if (value === null || value === "") return "?";
      return String(value);
    }
  }

  if (key === "team") {
    // team close only implies same division, so expose division clue.
    for (const row of rows) {
      if (row.feedback.team.status === "close") {
        const division = teamDivisionLabelByAbbr[row.player.team];
        if (division) return division;
      }
    }
  }

  if (key === "country") {
    // country close only implies same continent, so expose continent clue.
    for (const row of rows) {
      if (row.feedback.country.status === "close") {
        const continent = continentLabelByCountry[row.player.country];
        if (continent) return continent;
      }
    }
  }

  return "?";
}

/** Main interactive game board component. */
export function GameBoard() {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gameId, setGameId] = useState<string>("");
  const [targetPlayerId, setTargetPlayerId] = useState<string>("");
  const [maxRounds, setMaxRounds] = useState<number>(8);
  const [roundsLeft, setRoundsLeft] = useState<number>(8);
  const [status, setStatus] = useState<Status>("ongoing");
  const [searchInput, setSearchInput] = useState("");
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<SearchItem | null>(null);
  const [history, setHistory] = useState<GuessHistory[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [targetReveal, setTargetReveal] = useState<{ playerId: string; enName: string; zhName: string } | null>(null);
  const [fadingHeartIndexes, setFadingHeartIndexes] = useState<number[]>([]);
  const previousRoundsRef = useRef<number>(8);

  const isRevealReady = status !== "ongoing";
  const mysteryImageUrl = targetPlayerId ? buildHeadshotUrl(targetPlayerId) : "";
  const isLowHealth = status === "ongoing" && roundsLeft <= 3;

  /** Derive clue summary from the full guess history. */
  const clueValues = useMemo(() => {
    const clues: Record<FieldKey, string> = {
      team: "?",
      jersey: "?",
      position: "?",
      age: "?",
      country: "?",
      draftYear: "?",
      draftPick: "?",
      heightCm: "?",
      ppg: "?",
      playoffAppearances: "?",
    };

    for (const field of fields) {
      clues[field] = inferPinnedValue(history, field);
    }
    return clues;
  }, [history]);

  /** Start/restart one game with selected difficulty. */
  const createGame = useCallback(async (nextDifficulty: Difficulty): Promise<void> => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/game/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: nextDifficulty }),
    });
    const data = (await response.json()) as { gameId: string; maxRounds: number; targetPlayerId: string } | { error: string };
    if (!response.ok || "error" in data) {
      setError("创建游戏失败，请稍后重试。");
      setLoading(false);
      return;
    }
    setGameId(data.gameId);
    setTargetPlayerId(data.targetPlayerId);
    setMaxRounds(data.maxRounds);
    setRoundsLeft(data.maxRounds);
    previousRoundsRef.current = data.maxRounds;
    setFadingHeartIndexes([]);
    // Reset all round state when a new game starts.
    setHistory([]);
    setStatus("ongoing");
    setSelectedPlayer(null);
    setSearchInput("");
    setSearchItems([]);
    setTargetReveal(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Auto-create first game after component mount.
    void createGame("normal");
  }, [createGame]);

  useEffect(() => {
    // Animate only the hearts that were just lost in this round.
    const previous = previousRoundsRef.current;
    if (roundsLeft < previous) {
      const lostIndexes = Array.from({ length: previous - roundsLeft }, (_, offset) => roundsLeft + offset);
      setFadingHeartIndexes((current) => Array.from(new Set([...current, ...lostIndexes])));
      const timer = setTimeout(() => {
        setFadingHeartIndexes((current) => current.filter((index) => !lostIndexes.includes(index)));
      }, 430);
      previousRoundsRef.current = roundsLeft;
      return () => clearTimeout(timer);
    }
    previousRoundsRef.current = roundsLeft;
  }, [roundsLeft]);

  useEffect(() => {
    // Debounced search to reduce request burst while typing.
    if (searchInput.trim().length < 1 || status !== "ongoing") {
      setSearchItems([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(searchInput.trim())}`);
      if (!response.ok) return;
      const data = (await response.json()) as { items: SearchItem[] };
      setSearchItems(data.items);
    }, 120);
    return () => clearTimeout(timeout);
  }, [searchInput, status]);

  /** Submit selected player guess and sync UI with backend result. */
  async function submitGuess(): Promise<void> {
    if (!selectedPlayer || !gameId || status !== "ongoing") return;
    setLoading(true);
    setError("");
    const response = await fetch("/api/game/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, playerId: selectedPlayer.playerId }),
    });
    const data = (await response.json()) as GuessResult | { error: string };
    if (!response.ok || "error" in data) {
      setError("提交失败。可能重复猜测，或当前球员不在该难度池。\n");
      setLoading(false);
      return;
    }

    setHistory((prev) => [...prev, { feedback: data.feedback, player: data.guessedPlayer }]);
    setRoundsLeft(data.roundsLeft);
    setStatus(data.status);
    setSearchInput("");
    setSelectedPlayer(null);
    setSearchItems([]);

    if (data.status === "won") {
      setTargetReveal({
        playerId: data.guessedPlayer.playerId,
        enName: data.guessedPlayer.enName,
        zhName: data.guessedPlayer.zhName,
      });
    }
    if (data.status === "lost") {
      // Loss response carries final target for reveal banner.
      setTargetReveal(
        data.target
          ? { playerId: data.target.playerId, enName: data.target.enName, zhName: data.target.zhName }
          : null,
      );
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.25),transparent_30%),linear-gradient(135deg,#0a0f1e,#111827_55%,#0f172a)] text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
        <section className="relative z-50 overflow-visible rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              {/* <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">NBA 猜球员</p> */}
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl text-emerald-300">NBA 球员猜谜<span className="ml-2 text-base text-zinc-300">  (数据以 25-26 赛季常规赛为准)</span></h1>
              <p className="mt-2 text-sm text-zinc-300">系统随机选定一名球员，你需要在 8 回合内猜中。搜索支持中英文姓名和常见外号。</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <RuleHelpButton />
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm">
                  <Trophy className="size-4 text-amber-300" />
                  <span className="text-sm text-zinc-300">剩余回合</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: maxRounds }, (_, index) => {
                      const alive = index < roundsLeft;
                      return (
                        <span
                          key={index}
                          className={cn(
                            "select-none text-[16px] leading-none",
                            alive ? "text-rose-400" : "text-rose-950/60",
                            fadingHeartIndexes.includes(index) && "heart-loss-fade",
                            alive && isLowHealth && "heart-low-health-glow",
                          )}
                        >
                          ❤
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(["easy", "normal", "hard"] as Difficulty[]).map((mode) => (
                  <button
                    key={mode}
                    className={cn(
                      "w-[150px] rounded-2xl border px-3 py-2 text-center text-sm font-semibold transition",
                      difficulty === mode
                        ? "border-emerald-300 bg-emerald-500/20"
                        : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10",
                    )}
                    onClick={() => {
                      setDifficulty(mode);
                      void createGame(mode);
                    }}
                  >
                    {difficultyLabels[mode]}
                  </button>
                ))}
              </div>

              {error ? <p className="mt-5 whitespace-pre-line text-sm text-rose-300">{error}</p> : null}
              {status === "won" ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-200">
                  <Check className="size-4" /> 恭喜你，本局已猜中，答案是 {targetReveal?.enName}（{targetReveal?.zhName}）。
                </p>
              ) : null}
              {status === "lost" ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-sm text-rose-200">
                  <CircleHelp className="size-4" />
                  未在 8 回合内猜中，答案是 {targetReveal?.enName}（{targetReveal?.zhName}）。
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 lg:-ml-2">
              <div className="w-[320px]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80">
                  {mysteryImageUrl ? (
                    <img
                      src={mysteryImageUrl}
                      alt="mystery player"
                      className={cn(
                        "h-full w-full object-cover transition duration-500",
                        isRevealReady
                          ? "scale-100 blur-0 grayscale-0 brightness-100"
                          : "scale-125 blur-2xl grayscale brightness-50 contrast-150",
                      )}
                    />
                  ) : null}
                  {!isRevealReady ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35">
                      <span className="rounded-full border border-white/20 bg-black/45 px-3 py-1 text-xl text-zinc-200">🙂</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex w-10 flex-col items-center gap-2">
                <a
                  href="https://github.com/Sw1PerGoSwiPinG/guessNBAplayer"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-zinc-200 transition hover:bg-white/15"
                  aria-label="GitHub repository"
                >
                  <GitHubGlyph />
                </a>
                {/* <div
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-zinc-200"
                  title="vibe coding by codex 5.3"
                  aria-label="OpenAI"
                >
                  <OpenAIGlyph />
                </div> */}
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur md:p-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-zinc-400" />
              <input
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setSelectedPlayer(null);
                }}
                disabled={status !== "ongoing" || loading}
                placeholder="输入球员英文名、中文名或别名..."
                className="w-full rounded-xl border border-white/15 bg-black/30 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-300"
              />
              {searchItems.length > 0 && status === "ongoing" ? (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-xl">
                  {searchItems.map((item) => (
                    <button
                      key={item.playerId}
                      className={cn(
                        "mb-1 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10",
                        selectedPlayer?.playerId === item.playerId && "bg-white/10",
                      )}
                      onClick={() => {
                        setSelectedPlayer(item);
                        setSearchInput(`${item.enName} / ${item.zhName}`);
                        setSearchItems([]);
                      }}
                    >
                      <span className="font-medium">{item.enName}</span>
                      <span className="ml-2 text-zinc-300">{item.zhName}</span>
                      <span className="ml-2 text-xs text-zinc-400">{item.team} | {item.position}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void submitGuess()}
              disabled={!selectedPlayer || status !== "ongoing" || loading}
            >
              提交猜测
            </button>
            <button
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10"
              onClick={() => void createGame(difficulty)}
              disabled={loading}
            >
              <span className="inline-flex items-center gap-2">
                <RotateCcw className="size-4" />
                重开一局
              </span>
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-200">当前线索汇总（置顶）</p>
            <div className="mt-2 grid gap-2 md:grid-cols-5">
              {fields.map((field) => (
                <div key={field} className="rounded-lg border border-white/10 bg-black/25 p-2">
                  <p className="text-[11px] text-zinc-300">{fieldLabels[field]}</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-100">{clueValues[field]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-xs md:text-sm">
              <thead className="bg-white/5 text-zinc-300">
                <tr>
                  <th className="px-2 py-3 text-center">猜测球员</th>
                  {fields.map((field) => (
                    <th key={field} className={cn("px-1 py-3 text-center", fieldColClass[field])}>
                      {fieldLabels[field]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-zinc-400">
                      暂无猜测记录，请先提交一个球员。
                    </td>
                  </tr>
                ) : (
                  history
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <tr key={entry.player.playerId + entry.player.enName} className="border-t border-white/10">
                        <td className="px-2 py-3 font-medium">
                          <span className="block truncate" title={`${entry.player.enName} (${entry.player.zhName})`}>
                            {entry.player.enName}
                            <span className="ml-1 text-zinc-300">({entry.player.zhName})</span>
                          </span>
                        </td>
                        {fields.map((field) => (
                          <td key={field} className="px-1 py-3 text-center">
                            <FeedbackPill feedback={entry.feedback[field]} numeric={numericFields.has(field)} />
                          </td>
                        ))}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

/** Render one feedback marker cell in the history table. */
function FeedbackPill({ feedback, numeric }: { feedback: ValueFeedback; numeric: boolean }) {
  let symbol = "?";
  if (feedback.status === "exact") symbol = "✓";
  else if (numeric && feedback.direction === "up") symbol = "↑";
  else if (numeric && feedback.direction === "down") symbol = "↓";
  else if (feedback.status === "far") symbol = "✕";
  else if (feedback.status === "near" || feedback.status === "close") symbol = "≈";

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold leading-none",
        feedbackClass[feedback.status],
      )}
      title={feedback.status}
    >
      {symbol}
    </span>
  );
}

/** Compact glyph used as OpenAI mark in the side icon rail. */
// function OpenAIGlyph() {
//   return (
//     <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
//       <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
//       <path d="M12 3.5v5.3m0 6.4v5.3M3.5 12h5.3m6.4 0h5.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
//       <path d="M6.4 6.4l3.8 3.8m3.6 3.6l3.8 3.8M17.6 6.4l-3.8 3.8m-3.6 3.6l-3.8 3.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
//     </svg>
//   );
// }

/** Compact glyph used as GitHub mark in the side icon rail. */
function GitHubGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.21.68-.48 0-.23-.01-.86-.01-1.69-2.78.6-3.37-1.18-3.37-1.18-.46-1.15-1.11-1.46-1.11-1.46-.9-.61.07-.6.07-.6 1 .07 1.52 1.01 1.52 1.01.88 1.5 2.31 1.07 2.88.81.09-.63.35-1.07.63-1.31-2.22-.25-4.56-1.1-4.56-4.89 0-1.08.39-1.97 1.03-2.66-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.67 9.67 0 0 1 12 6.85c.86 0 1.73.12 2.54.36 1.91-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.69 1.03 1.58 1.03 2.66 0 3.8-2.35 4.64-4.58 4.89.36.31.67.92.67 1.86 0 1.34-.01 2.42-.01 2.74 0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

/** Render rules helper with hover tooltip panel. */
function RuleHelpButton() {
  return (
    <div className="group relative">
      <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm leading-5 text-zinc-300 transition hover:bg-black/30">
        规则说明
      </span>
      <div className="pointer-events-none invisible absolute right-0 top-11 z-40 w-[360px] rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-xs leading-5 text-zinc-200 opacity-0 shadow-2xl transition duration-150 group-hover:visible group-hover:opacity-100 md:w-[460px]">
        <p className="mb-2 text-sm font-semibold text-white">符号含义</p>
        <p>1. 可量化字段（号码、年龄、选秀年/顺位、身高、得分、季后赛次数）：`↑` 目标更大，`↓` 目标更小，`✓` 完全命中。</p>
        <p>2. 不可量化字段（队伍、国家、位置）：`✓` 命中，`✕` 不匹配，`≈` 接近（队伍同分区、国家同大洲、位置同大类）。</p>
        <p>3. 颜色：绿色 = 命中，亮绿 = 非常接近，蓝色 = 接近，红色 = 差距大，灰色 = 数据未知。</p>
        <p>4. 接近规则：位置同大类（后卫组 PG/SG、锋线组 SF、内线组 PF/C）；队伍同分区（按照六大分区；国家同大洲。</p>
        <div className="mb-2">
          <p className="mb-1">5. 六大分区示例：</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pl-4 list-disc marker:text-zinc-500">
            <li><span className="font-medium text-white/90">西北：</span>DEN, MIN, OKC, POR, UTA</li>
            <li><span className="font-medium text-white/90">太平洋：</span>GSW, LAC, LAL, PHX, SAC</li>
            <li><span className="font-medium text-white/90">西南：</span>DAL, HOU, MEM, NOP, SAS</li>
            <li><span className="font-medium text-white/90">大西洋：</span>BOS, BKN, NYK, PHI, TOR</li>
            <li><span className="font-medium text-white/90">中部：</span>CHI, CLE, DET, IND, MIL</li>
            <li><span className="font-medium text-white/90">东南：</span>ATL, CHA, MIA, ORL, WAS</li>
          </ul>
        </div>
        <p>6. 数值接近阈值：号码 ±1/±3，年龄 ±1/±3，身高 ±2/±6，得分 ±1.5/±4，季后赛次数 ±1/±3，选秀年份 ±1/±3，选秀顺位 ±3/±10（前者非常接近，后者接近）。</p>
        <p>7. 线索汇总格式：单边约束显示 `&gt; x` 或 `&lt; x`；双边约束显示 `a &lt; ~ &lt; b`；命中则直接显示真实值。</p>
        <p>8. 队伍/国家优化：若显示 `≈`，线索汇总会展示范围信息（队伍显示赛区名，国家显示大洲名）。</p>
        <p>9. 难度规则：简单模式要求场均时间不低于 25 分钟且赛季出场不少于 20 场；普通模式要求场均时间不低于 20 分钟且赛季出场不少于 15 场；困难模式要求场均时间不低于 15 分钟且赛季出场不少于 10 场。</p>
      </div>
    </div>
  );
}

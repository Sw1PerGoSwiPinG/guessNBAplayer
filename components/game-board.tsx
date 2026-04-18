"use client";

import { Check, CircleHelp, RotateCcw, Search, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "normal" | "hard";
type Status = "ongoing" | "won" | "lost";
type FeedbackStatus = "exact" | "near" | "close" | "far" | "unknown";

type FieldKey =
  | "team"
  | "jersey"
  | "position"
  | "country"
  | "draftYear"
  | "draftPick"
  | "heightCm"
  | "careerYears"
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
  country: ValueFeedback;
  draftYear: ValueFeedback;
  draftPick: ValueFeedback;
  heightCm: ValueFeedback;
  careerYears: ValueFeedback;
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
  country: string;
  draftYear: number | null;
  draftPick: number | null;
  heightCm: number | null;
  careerYears: number | null;
  ppg: number | null;
  playoffAppearances: number | null;
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
  easy: "简单（场均时间 >= 25 分钟）",
  normal: "普通（场均时间 >= 20 分钟）",
  hard: "困难（场均时间 >= 15 分钟）",
};

const fieldLabels: Record<FieldKey, string> = {
  team: "队伍",
  jersey: "球衣号码",
  position: "司职位置",
  country: "国家",
  draftYear: "选秀年份",
  draftPick: "选秀顺位",
  heightCm: "身高（cm）",
  careerYears: "生涯长度（年）",
  ppg: "场均得分",
  playoffAppearances: "季后赛次数",
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
  "country",
  "draftYear",
  "draftPick",
  "heightCm",
  "careerYears",
  "ppg",
  "playoffAppearances",
];

const numericFields = new Set<FieldKey>(["jersey", "draftYear", "draftPick", "heightCm", "careerYears", "ppg", "playoffAppearances"]);

const numericRule: Record<
  "jersey" | "draftYear" | "draftPick" | "heightCm" | "careerYears" | "ppg" | "playoffAppearances",
  { near: number; close: number; step: number; decimals: number }
> = {
  jersey: { near: 1, close: 3, step: 1, decimals: 0 },
  draftYear: { near: 1, close: 3, step: 1, decimals: 0 },
  draftPick: { near: 3, close: 10, step: 1, decimals: 0 },
  heightCm: { near: 2, close: 6, step: 1, decimals: 0 },
  careerYears: { near: 1, close: 3, step: 1, decimals: 0 },
  ppg: { near: 1.5, close: 4, step: 0.1, decimals: 1 },
  playoffAppearances: { near: 1, close: 3, step: 1, decimals: 0 },
};

function emptyStats(): Record<Difficulty, { wins: number; games: number; streak: number }> {
  return { easy: { wins: 0, games: 0, streak: 0 }, normal: { wins: 0, games: 0, streak: 0 }, hard: { wins: 0, games: 0, streak: 0 } };
}

function readStats(): Record<Difficulty, { wins: number; games: number; streak: number }> {
  if (typeof window === "undefined") return emptyStats();
  const raw = window.localStorage.getItem("nba-guess-stats");
  if (!raw) return emptyStats();
  try {
    return JSON.parse(raw) as Record<Difficulty, { wins: number; games: number; streak: number }>;
  } catch {
    return emptyStats();
  }
}

function saveStats(stats: Record<Difficulty, { wins: number; games: number; streak: number }>): void {
  window.localStorage.setItem("nba-guess-stats", JSON.stringify(stats));
}

function formatValue(value: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

function parseJersey(value: string): number | null {
  const v = value.trim();
  if (!/^\d+$/.test(v)) return null;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function inferNumericRange(
  rows: GuessHistory[],
  key: "jersey" | "draftYear" | "draftPick" | "heightCm" | "careerYears" | "ppg" | "playoffAppearances",
): string {
  const rule = numericRule[key];
  let lower = Number.NEGATIVE_INFINITY;
  let upper = Number.POSITIVE_INFINITY;
  let hasConstraint = false;

  for (const row of rows) {
    const feedback = row.feedback[key as FieldKey];
    const guessedValue = key === "jersey" ? parseJersey(row.player.jersey) : row.player[key];

    if (guessedValue === null || feedback.status === "unknown") continue;
    if (feedback.status === "exact") {
      return formatValue(guessedValue, rule.decimals);
    }
    if (!feedback.direction) continue;

    hasConstraint = true;
    if (feedback.direction === "up") {
      if (feedback.status === "far") {
        lower = Math.max(lower, guessedValue + rule.close + rule.step);
      } else {
        lower = Math.max(lower, guessedValue + rule.step);
        if (feedback.status === "near") upper = Math.min(upper, guessedValue + rule.near);
        if (feedback.status === "close") upper = Math.min(upper, guessedValue + rule.close);
      }
    }

    if (feedback.direction === "down") {
      if (feedback.status === "far") {
        upper = Math.min(upper, guessedValue - rule.close - rule.step);
      } else {
        upper = Math.min(upper, guessedValue - rule.step);
        if (feedback.status === "near") lower = Math.max(lower, guessedValue - rule.near);
        if (feedback.status === "close") lower = Math.max(lower, guessedValue - rule.close);
      }
    }
  }

  if (!hasConstraint) return "?";
  if (lower > upper) return "范围收敛中";

  if (Number.isFinite(lower) && Number.isFinite(upper)) {
    return `${formatValue(lower, rule.decimals)} ~ ${formatValue(upper, rule.decimals)}`;
  }
  if (Number.isFinite(lower)) return `>= ${formatValue(lower, rule.decimals)}`;
  if (Number.isFinite(upper)) return `<= ${formatValue(upper, rule.decimals)}`;
  return "?";
}

function inferPinnedValue(rows: GuessHistory[], key: FieldKey): string {
  if (rows.length === 0) return "?";

  if (["jersey", "draftYear", "draftPick", "heightCm", "careerYears", "ppg", "playoffAppearances"].includes(key)) {
    return inferNumericRange(
      rows,
      key as "jersey" | "draftYear" | "draftPick" | "heightCm" | "careerYears" | "ppg" | "playoffAppearances",
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
  return "?";
}

export function GameBoard() {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gameId, setGameId] = useState<string>("");
  const [maxRounds, setMaxRounds] = useState<number>(8);
  const [roundsLeft, setRoundsLeft] = useState<number>(8);
  const [status, setStatus] = useState<Status>("ongoing");
  const [searchInput, setSearchInput] = useState("");
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<SearchItem | null>(null);
  const [history, setHistory] = useState<GuessHistory[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [targetReveal, setTargetReveal] = useState<{ enName: string; zhName: string } | null>(null);
  const [stats, setStats] = useState<Record<Difficulty, { wins: number; games: number; streak: number }>>(readStats());

  const currentStats = stats[difficulty];
  const winRate = currentStats.games > 0 ? Math.round((currentStats.wins / currentStats.games) * 100) : 0;

  const statusTitle = useMemo(() => {
    if (status === "won") return "本局已获胜";
    if (status === "lost") return "本局已失败";
    return `剩余回合 ${roundsLeft}/${maxRounds}`;
  }, [maxRounds, roundsLeft, status]);

  const clueValues = useMemo(() => {
    const clues: Record<FieldKey, string> = {
      team: "?",
      jersey: "?",
      position: "?",
      country: "?",
      draftYear: "?",
      draftPick: "?",
      heightCm: "?",
      careerYears: "?",
      ppg: "?",
      playoffAppearances: "?",
    };

    for (const field of fields) {
      clues[field] = inferPinnedValue(history, field);
    }
    return clues;
  }, [history]);

  const createGame = useCallback(async (nextDifficulty: Difficulty): Promise<void> => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/game/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: nextDifficulty }),
    });
    const data = (await response.json()) as { gameId: string; maxRounds: number } | { error: string };
    if (!response.ok || "error" in data) {
      setError("创建游戏失败，请稍后重试。");
      setLoading(false);
      return;
    }
    setGameId(data.gameId);
    setMaxRounds(data.maxRounds);
    setRoundsLeft(data.maxRounds);
    setHistory([]);
    setStatus("ongoing");
    setSelectedPlayer(null);
    setSearchInput("");
    setSearchItems([]);
    setTargetReveal(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void createGame("normal");
  }, [createGame]);

  useEffect(() => {
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

  function commitGameResult(win: boolean): void {
    const next = { ...stats };
    next[difficulty] = {
      wins: next[difficulty].wins + (win ? 1 : 0),
      games: next[difficulty].games + 1,
      streak: win ? next[difficulty].streak + 1 : 0,
    };
    setStats(next);
    saveStats(next);
  }

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
      commitGameResult(true);
    }
    if (data.status === "lost") {
      commitGameResult(false);
      setTargetReveal(data.target ? { enName: data.target.enName, zhName: data.target.zhName } : null);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.25),transparent_30%),linear-gradient(135deg,#0a0f1e,#111827_55%,#0f172a)] text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
        <section className="relative z-50 overflow-visible rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">NBA 猜球员</p>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">25-26 常规赛球员猜谜</h1>
              <p className="mt-2 text-sm text-zinc-300">系统随机选定一名球员，你需要在 8 回合内猜中。搜索支持中英文姓名和常见外号。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RuleHelpButton />
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm">
                <Trophy className="size-4 text-amber-300" />
                <span>{statusTitle}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {(["easy", "normal", "hard"] as Difficulty[]).map((mode) => (
              <button
                key={mode}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  difficulty === mode
                    ? "border-emerald-300 bg-emerald-500/20"
                    : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10",
                )}
                onClick={() => {
                  setDifficulty(mode);
                  void createGame(mode);
                }}
              >
                <p className="text-sm font-semibold">{difficultyLabels[mode]}</p>
                <p className="mt-1 text-xs text-zinc-300">胜率 {stats[mode].games > 0 ? Math.round((stats[mode].wins / stats[mode].games) * 100) : 0}%</p>
              </button>
            ))}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-300">当前难度战绩</p>
              <p className="mt-2 text-sm">局数 {currentStats.games} | 胜率 {winRate}% | 连胜 {currentStats.streak}</p>
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
                新开一局
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

          {error ? <p className="mt-3 whitespace-pre-line text-sm text-rose-300">{error}</p> : null}
          {status === "won" ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-200">
              <Check className="size-4" /> 恭喜你，本局已猜中。
            </p>
          ) : null}
          {status === "lost" ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-sm text-rose-200">
              <CircleHelp className="size-4" />
              未在 8 回合内猜中，答案是 {targetReveal?.enName}（{targetReveal?.zhName}）。
            </p>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="bg-white/5 text-zinc-300">
                <tr>
                  <th className="px-3 py-3 text-left">猜测球员</th>
                  {fields.map((field) => (
                    <th key={field} className="px-2 py-3 text-left">
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
                        <td className="px-3 py-3 font-medium">
                          {entry.player.enName}
                          <span className="ml-1 text-zinc-300">({entry.player.zhName})</span>
                        </td>
                        {fields.map((field) => (
                          <td key={field} className="px-2 py-3">
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

function RuleHelpButton() {
  return (
    <div className="group relative">
      <button className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/12">
        规则说明
      </button>
      <div className="pointer-events-none invisible absolute right-0 top-11 z-40 w-[360px] rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-xs leading-5 text-zinc-200 opacity-0 shadow-2xl transition duration-150 group-hover:visible group-hover:opacity-100 md:w-[460px]">
        <p className="mb-2 text-sm font-semibold text-white">符号含义</p>
        <p>1. 可量化字段（号码、选秀年/顺位、身高、生涯长度、得分、季后赛次数）：`↑` 目标更大，`↓` 目标更小，`✓` 完全命中。</p>
        <p>2. 不可量化字段（队伍、国家、位置）：`✓` 命中，`✕` 不匹配，`≈` 接近（主要用于位置大类接近）。</p>
        <p>3. 颜色：绿色 = 命中，亮绿 = 非常接近，蓝色 = 接近，红色 = 差距大，灰色 = 数据未知。</p>
        <p>4. 位置接近规则：后卫组（PG/SG）、锋线组（SF）、内线组（PF/C），同组记为接近。</p>
        <p>5. 数值接近阈值：号码 ±1/±3，身高 ±2/±6，生涯长度 ±1/±3，得分 ±1.5/±4，季后赛次数 ±1/±3，选秀年份 ±1/±3，选秀顺位 ±3/±10（前者非常接近，后者接近）。</p>
      </div>
    </div>
  );
}

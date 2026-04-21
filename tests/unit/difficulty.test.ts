import { describe, expect, it } from "vitest";
import { getDifficultyGamesThreshold, getDifficultyPool, getDifficultyThreshold } from "@/lib/data";

describe("difficulty pool", () => {
  it("returns configured thresholds", () => {
    expect(getDifficultyThreshold("easy")).toBe(25);
    expect(getDifficultyThreshold("normal")).toBe(20);
    expect(getDifficultyThreshold("hard")).toBe(15);
    expect(getDifficultyGamesThreshold("easy")).toBe(20);
    expect(getDifficultyGamesThreshold("normal")).toBe(15);
    expect(getDifficultyGamesThreshold("hard")).toBe(10);
  });

  it("filters by mpg and games played boundaries", () => {
    const easy = getDifficultyPool("easy");
    const normal = getDifficultyPool("normal");
    const hard = getDifficultyPool("hard");

    expect(easy.every((player) => (player.mpg ?? 0) >= 25)).toBe(true);
    expect(normal.every((player) => (player.mpg ?? 0) >= 20)).toBe(true);
    expect(hard.every((player) => (player.mpg ?? 0) >= 15)).toBe(true);
    expect(easy.every((player) => (player.gamesPlayed ?? 0) >= 20)).toBe(true);
    expect(normal.every((player) => (player.gamesPlayed ?? 0) >= 15)).toBe(true);
    expect(hard.every((player) => (player.gamesPlayed ?? 0) >= 10)).toBe(true);
    expect(easy.length).toBeLessThanOrEqual(normal.length);
    expect(normal.length).toBeLessThanOrEqual(hard.length);
  });
});


import { describe, expect, it } from "vitest";
import { getDifficultyPool, getDifficultyThreshold } from "@/lib/data";

describe("difficulty pool", () => {
  it("returns configured thresholds", () => {
    expect(getDifficultyThreshold("easy")).toBe(25);
    expect(getDifficultyThreshold("normal")).toBe(20);
    expect(getDifficultyThreshold("hard")).toBe(15);
  });

  it("filters by mpg boundary", () => {
    const easy = getDifficultyPool("easy");
    const normal = getDifficultyPool("normal");
    const hard = getDifficultyPool("hard");

    expect(easy.every((player) => (player.mpg ?? 0) >= 25)).toBe(true);
    expect(normal.every((player) => (player.mpg ?? 0) >= 20)).toBe(true);
    expect(hard.every((player) => (player.mpg ?? 0) >= 15)).toBe(true);
    expect(easy.length).toBeLessThanOrEqual(normal.length);
    expect(normal.length).toBeLessThanOrEqual(hard.length);
  });
});


import { describe, expect, it } from "vitest";
import { searchPlayers } from "@/lib/search";

describe("player search", () => {
  it("matches english aliases", () => {
    const results = searchPlayers("curry");
    expect(results.some((player) => player.enName === "Stephen Curry")).toBe(true);
  });

  it("matches chinese names", () => {
    const results = searchPlayers("库里");
    expect(results.some((player) => player.zhName.includes("库里"))).toBe(true);
  });

  it("matches chinese nicknames", () => {
    const results = searchPlayers("字母哥");
    expect(results.some((player) => player.enName === "Giannis Antetokounmpo")).toBe(true);
  });

  it("limits result size", () => {
    const results = searchPlayers("a");
    expect(results.length).toBeLessThanOrEqual(8);
  });
});


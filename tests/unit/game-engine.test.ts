import { describe, expect, it } from "vitest";
import { buildGuessFeedback } from "@/lib/game-engine";

describe("game engine", () => {
  it("returns exact when all values are equal", () => {
    const feedback = buildGuessFeedback("2544", "2544");
    expect(feedback.isCorrect).toBe(true);
    expect(feedback.team.status).toBe("exact");
    expect(feedback.heightCm.status).toBe("exact");
  });

  it("returns direction and proximity for numeric fields", () => {
    const feedback = buildGuessFeedback("1628983", "1629029");
    expect(feedback.isCorrect).toBe(false);
    expect(["near", "close", "far"]).toContain(feedback.ppg.status);
    expect(["up", "down"]).toContain(feedback.ppg.direction);
  });

  it("compares jersey as numeric field with direction", () => {
    const feedback = buildGuessFeedback("201939", "2544");
    expect(["near", "close", "far"]).toContain(feedback.jersey.status);
    expect(feedback.jersey.direction).toBe("down");
  });

  it("supports position near by group", () => {
    const feedback = buildGuessFeedback("1630162", "1630224");
    expect(["exact", "close", "far"]).toContain(feedback.position.status);
  });

  it("marks team close when in same NBA division", () => {
    const feedback = buildGuessFeedback("201939", "2544");
    expect(feedback.team.status).toBe("close");
  });

  it("marks team far when in different NBA divisions", () => {
    const feedback = buildGuessFeedback("201939", "203999");
    expect(feedback.team.status).toBe("far");
  });

  it("marks country close when in same continent", () => {
    const feedback = buildGuessFeedback("203999", "1629029");
    expect(feedback.country.status).toBe("close");
  });
});


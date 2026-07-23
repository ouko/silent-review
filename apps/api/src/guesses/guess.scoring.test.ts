import { calculateGuessScore } from "./guesses.service.js";

describe("calculateGuessScore", () => {
  it("awards 10 points for an exact guess", () => {
    expect(calculateGuessScore(7, 7)).toBe(10);
  });

  it("awards 5 points for off-by-1", () => {
    expect(calculateGuessScore(7, 6)).toBe(5);
    expect(calculateGuessScore(7, 8)).toBe(5);
  });

  it("awards 2 points for off-by-2", () => {
    expect(calculateGuessScore(7, 5)).toBe(2);
    expect(calculateGuessScore(7, 9)).toBe(2);
  });

  it("awards 0 points for guesses off by 3 or more", () => {
    expect(calculateGuessScore(7, 1)).toBe(0);
    expect(calculateGuessScore(7, 4)).toBe(0);
    expect(calculateGuessScore(7, 10)).toBe(0);
  });
});

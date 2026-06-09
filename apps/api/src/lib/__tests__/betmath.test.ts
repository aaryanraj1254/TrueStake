import { describe, expect, it } from "vitest";
import { betCost, resolveBet } from "../betmath.js";

describe("betCost", () => {
  it("charges the stake when uninsured", () => {
    expect(betCost(500, false)).toBe(500);
  });
  it("adds a 10% premium when insured", () => {
    expect(betCost(500, true)).toBe(550);
    expect(betCost(1000, true)).toBe(1100);
  });
});

describe("resolveBet", () => {
  it("pays 2x on a winning UP bet (value at/above prediction)", () => {
    const r = resolveBet("up", 100, 500, 120, false);
    expect(r.won).toBe(true);
    expect(r.payout).toBe(1000);
    expect(r.supercoins).toBe(100); // floor(1000 * 0.1)
    expect(r.insuranceRefund).toBe(0);
  });

  it("loses an UP bet when the value lands below the prediction", () => {
    const r = resolveBet("up", 100, 500, 80, false);
    expect(r.won).toBe(false);
    expect(r.payout).toBe(0);
    expect(r.supercoins).toBe(0);
  });

  it("pays 2x on a winning DOWN bet (value below prediction)", () => {
    const r = resolveBet("down", 100, 500, 80, false);
    expect(r.won).toBe(true);
    expect(r.payout).toBe(1000);
  });

  it("loses a DOWN bet when the value is at/above prediction", () => {
    expect(resolveBet("down", 100, 500, 100, false).won).toBe(false);
  });

  it("refunds 50% of the stake on an insured loss only", () => {
    const lost = resolveBet("up", 100, 500, 80, true);
    expect(lost.won).toBe(false);
    expect(lost.insuranceRefund).toBe(250);

    const won = resolveBet("up", 100, 500, 120, true);
    expect(won.won).toBe(true);
    expect(won.insuranceRefund).toBe(0); // no refund when you win
  });

  it("treats value exactly equal to prediction as UP (>= boundary)", () => {
    expect(resolveBet("up", 100, 500, 100, false).won).toBe(true);
  });
});

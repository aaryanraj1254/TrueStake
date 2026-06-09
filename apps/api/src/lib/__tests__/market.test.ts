import { describe, expect, it } from "vitest";
import { computeOdds, deterministicUuid } from "../market.js";

describe("computeOdds (parimutuel)", () => {
  it("computes total_pool / pool_on_side per side", () => {
    const { oddsUp, oddsDown, total } = computeOdds(1000, 500);
    expect(total).toBe(1500);
    expect(oddsUp).toBe(1.5); // 1500 / 1000
    expect(oddsDown).toBe(3); // 1500 / 500
  });

  it("falls back to 2.0x for a side with no stake", () => {
    const a = computeOdds(0, 500);
    expect(a.oddsUp).toBe(2); // default, no up pool
    expect(a.oddsDown).toBe(1); // 500 / 500
    const b = computeOdds(0, 0);
    expect(b.oddsUp).toBe(2);
    expect(b.oddsDown).toBe(2);
  });

  it("rounds odds to 3 decimals", () => {
    const { oddsUp } = computeOdds(700, 300); // 1000/700 = 1.42857…
    expect(oddsUp).toBe(1.429);
  });
});

describe("deterministicUuid", () => {
  it("is stable for the same input", () => {
    expect(deterministicUuid("crypto:bitcoin")).toBe(deterministicUuid("crypto:bitcoin"));
  });

  it("differs for different inputs", () => {
    expect(deterministicUuid("crypto:bitcoin")).not.toBe(deterministicUuid("stock:RELIANCE"));
  });

  it("produces a valid v5-shaped UUID", () => {
    const uuid = deterministicUuid("sport:12345");
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

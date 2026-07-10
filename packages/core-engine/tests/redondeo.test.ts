import { describe, it, expect } from "vitest";
import { roundUpSafe, roundDownSafe, iguales } from "../src/utils/redondeo.js";

describe("redondeo safe tests", () => {
  it("roundUpSafe borders", () => {
    // Standard JS: Math.ceil(3.0000000000000004) -> 4
    // roundUpSafe: Math.ceil(3.0000000000000004 - 1e-9) -> 3
    expect(roundUpSafe(3.000000000001)).toBe(3);
    expect(roundUpSafe(3.0000001)).toBe(4);
    expect(roundUpSafe(3.0)).toBe(3);
    expect(roundUpSafe(3.5)).toBe(4);
  });

  it("roundDownSafe borders", () => {
    // Standard JS: Math.floor(2.9999999999999996) -> 2
    // roundDownSafe: Math.floor(2.9999999999999996 + 1e-9) -> 3
    expect(roundDownSafe(2.999999999999)).toBe(3);
    expect(roundDownSafe(2.999999)).toBe(2);
    expect(roundDownSafe(3.0)).toBe(3);
    expect(roundDownSafe(2.5)).toBe(2);
  });

  it("iguales borders", () => {
    expect(iguales(1.2000000001, 1.2)).toBe(true);
    expect(iguales(1.20001, 1.2)).toBe(false);
  });
});

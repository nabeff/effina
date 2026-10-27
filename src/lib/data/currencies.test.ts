import { describe, it, expect } from "vitest";
import { CURRENCIES, searchCurrencies } from "./currencies";

describe("searchCurrencies", () => {
  it("returns everything for an empty query", () => {
    expect(searchCurrencies("")).toHaveLength(CURRENCIES.length);
    expect(searchCurrencies("   ")).toHaveLength(CURRENCIES.length);
  });

  it("finds a currency by the place people think of", () => {
    expect(searchCurrencies("morocco")[0].code).toBe("DH");
    expect(searchCurrencies("japan")[0].code).toBe("JPY");
    expect(searchCurrencies("dubai")[0].code).toBe("AED");
  });

  it("puts an exact code first, even when others contain it", () => {
    expect(searchCurrencies("dh")[0].code).toBe("DH");
    expect(searchCurrencies("usd")[0].code).toBe("USD");
  });

  it("finds by name", () => {
    expect(searchCurrencies("dirham").map((c) => c.code)).toContain("AED");
    expect(searchCurrencies("krona")[0].code).toBe("SEK");
  });

  it("ignores case and surrounding space", () => {
    expect(searchCurrencies("  EuRo ")[0].code).toBe("EUR");
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(searchCurrencies("zzzzz")).toEqual([]);
  });

  it("has no duplicate codes", () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("gives every currency a name and a place", () => {
    for (const c of CURRENCIES) {
      expect(c.name.length).toBeGreaterThan(2);
      expect(c.where.length).toBeGreaterThan(2);
    }
  });
});

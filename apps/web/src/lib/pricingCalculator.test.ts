import { describe, expect, it } from "vitest";
import { suggestedPriceForMargin, marginPctForPrice } from "./pricingCalculator";

describe("suggestedPriceForMargin", () => {
  it("rechnet den Plan-Fall: 800 Kosten, 40% Marge → 1.333,33 €", () => {
    expect(suggestedPriceForMargin(800, 40)).toBeCloseTo(1333.33, 1);
  });

  it("liefert die Kosten selbst bei 0% Marge", () => {
    expect(suggestedPriceForMargin(500, 0)).toBe(500);
  });

  it("gibt null bei 100% oder mehr Marge zurück (Division durch 0/negativ)", () => {
    expect(suggestedPriceForMargin(500, 100)).toBeNull();
    expect(suggestedPriceForMargin(500, 150)).toBeNull();
  });

  it("gibt null bei negativen Eingaben zurück", () => {
    expect(suggestedPriceForMargin(-10, 30)).toBeNull();
    expect(suggestedPriceForMargin(500, -5)).toBeNull();
  });
});

describe("marginPctForPrice", () => {
  it("rechnet die Marge aus Kosten und Preis", () => {
    expect(marginPctForPrice(800, 1333.33)).toBeCloseTo(40, 1);
  });

  it("gibt null bei Preis <= 0 zurück", () => {
    expect(marginPctForPrice(100, 0)).toBeNull();
    expect(marginPctForPrice(100, -10)).toBeNull();
  });

  it("ist die Umkehrung von suggestedPriceForMargin", () => {
    const price = suggestedPriceForMargin(500, 25)!;
    expect(marginPctForPrice(500, price)).toBeCloseTo(25, 5);
  });
});

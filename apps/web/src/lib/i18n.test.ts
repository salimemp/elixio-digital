import { describe, it, expect } from "vitest";
import { formatPrice, formatNumber, currencyForLocale, intlTag } from "./i18n.js";

describe("formatPrice — CJK locales", () => {
  it("formats CNY in Simplified Chinese", () => {
    const out = formatPrice(1000000, "CNY", "zh");
    // zh-Hans, ¥ symbol, comma grouping
    expect(out).toMatch(/¥/);
    expect(out).toMatch(/10[,，]000/); // accepts either English or Chinese comma
    expect(out).toContain(".00");
  });

  it("formats TWD in Traditional Chinese", () => {
    const out = formatPrice(1000000, "TWD", "zh-TW");
    expect(out).toMatch(/NT\$|NT\u00A0\$|\$/); // NT$ for TWD
  });

  it("formats JPY in Japanese (no decimals)", () => {
    const out = formatPrice(100000, "JPY", "ja");
    expect(out).toMatch(/[¥￥]/);
    // JPY has no fractional units
    expect(out).not.toMatch(/\.00$/);
  });

  it("formats KRW in Korean (no decimals)", () => {
    const out = formatPrice(10000000, "KRW", "ko");
    expect(out).toContain("₩");
    expect(out).not.toMatch(/\.00$/);
  });

  it("uses zh-Hans for zh and zh-Hant for zh-TW", () => {
    expect(intlTag("zh")).toBe("zh-Hans");
    expect(intlTag("zh-TW")).toBe("zh-Hant");
    expect(intlTag("ja")).toBe("ja");
    expect(intlTag("ko")).toBe("ko");
  });

  it("falls back gracefully for invalid currency", () => {
    const out = formatPrice(1234, "INVALID", "en");
    expect(out).toBeTruthy();
  });
});

describe("currencyForLocale — CJK locales", () => {
  it("maps zh to CNY", () => {
    expect(currencyForLocale("zh")).toBe("CNY");
  });

  it("maps zh-TW to TWD", () => {
    expect(currencyForLocale("zh-TW")).toBe("TWD");
  });

  it("maps ja to JPY", () => {
    expect(currencyForLocale("ja")).toBe("JPY");
  });

  it("maps ko to KRW", () => {
    expect(currencyForLocale("ko")).toBe("KRW");
  });
});

describe("formatNumber — CJK locales use locale grouping", () => {
  it("formats numbers with zh-Hans grouping", () => {
    const out = formatNumber(1234567, "zh");
    expect(out).toBe("1,234,567"); // Chinese uses English comma grouping for plain numbers
  });

  it("formats numbers with Japanese grouping", () => {
    const out = formatNumber(1234567, "ja");
    expect(out).toBe("1,234,567");
  });

  it("formats numbers with Korean grouping", () => {
    const out = formatNumber(1234567, "ko");
    expect(out).toBe("1,234,567");
  });
});

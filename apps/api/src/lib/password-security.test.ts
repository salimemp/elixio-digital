import { describe, it, expect } from "vitest";
import {
  validatePasswordStrength,
  scorePassword,
  describeIssue,
  checkPwnedPassword,
  checkPassword,
} from "./password-security.js";

describe("validatePasswordStrength", () => {
  it("rejects password shorter than 8 characters", () => {
    expect(validatePasswordStrength("Ab1!")).toContain("too-short");
  });

  it("rejects password longer than 128 characters", () => {
    const tooLong = "A".repeat(129) + "1!";
    expect(validatePasswordStrength(tooLong)).toContain("too-long");
  });

  it("rejects password with no letter", () => {
    expect(validatePasswordStrength("12345678!")).toContain("no-letter");
  });

  it("rejects password with no number", () => {
    expect(validatePasswordStrength("OnlyLetters!")).toContain("no-number");
  });

  it("rejects password with no special character", () => {
    expect(validatePasswordStrength("Abcdefgh1")).toContain("no-special");
  });

  it("accepts password that meets all rules", () => {
    expect(validatePasswordStrength("StrongP4ss!")).toEqual([]);
  });

  it("accepts password at exactly the minimum length", () => {
    expect(validatePasswordStrength("Abcd123!")).toEqual([]);
  });

  it("accepts password at exactly the maximum length", () => {
    // MAX_LENGTH is 128 — exactly 128 chars is OK
    const max = "A".repeat(126) + "1!";
    expect(max.length).toBe(128);
    expect(validatePasswordStrength(max)).toEqual([]);
  });

  it("reports multiple issues in a single pass", () => {
    const issues = validatePasswordStrength("short");
    expect(issues).toContain("too-short");
    expect(issues).toContain("no-number");
    expect(issues).toContain("no-special");
  });

  it("counts whitespace as neither letter nor special", () => {
    // "Abc defg1" — has letter, number, but whitespace is not a special
    expect(validatePasswordStrength("Abc defg1")).toContain("no-special");
  });

  it("accepts various special characters", () => {
    expect(validatePasswordStrength("Pass1234@")).toEqual([]);
    expect(validatePasswordStrength("Pass1234#")).toEqual([]);
    expect(validatePasswordStrength("Pass1234$")).toEqual([]);
    expect(validatePasswordStrength("Pass1234%")).toEqual([]);
    expect(validatePasswordStrength("Pass1234^")).toEqual([]);
    expect(validatePasswordStrength("Pass1234&")).toEqual([]);
    expect(validatePasswordStrength("Pass1234*")).toEqual([]);
    expect(validatePasswordStrength("Pass1234?")).toEqual([]);
  });
});

describe("scorePassword", () => {
  it("returns 0 for empty password", () => {
    expect(scorePassword("")).toBe(0);
  });

  it("returns 0 for short passwords even with all character classes", () => {
    expect(scorePassword("Aa1!")).toBe(0);
  });

  it("returns 1 for medium-length passwords with 3+ classes", () => {
    expect(scorePassword("Abcdefg1!")).toBe(1);
  });

  it("returns 3 for 12-char passwords", () => {
    // The function uses strict-less-than: 12 chars skips score 2, lands on score 3
    expect(scorePassword("Abcdefghij1!")).toBe(3);
  });

  it("returns 4 for 16-char passwords (16 is not strictly less than 16)", () => {
    expect(scorePassword("Abcdefghijklmno1!")).toBe(4);
  });

  it("returns 4 for very long passwords with all classes", () => {
    expect(scorePassword("Abcdefghijklmnopqrst1!@")).toBe(4);
  });

  it("downgrades for missing character classes", () => {
    // 14 chars, 2 classes (only lower) → fails classes < 3 → score 0
    expect(scorePassword("abcdefghijklmn")).toBe(0);
    // 11 chars, 3 classes (no special) → score 2 (length < 12)
    expect(scorePassword("Abcdefghij1")).toBe(2);
  });
});

describe("describeIssue", () => {
  it("returns human-readable messages for each issue code", () => {
    expect(describeIssue("too-short")).toContain("at least 8");
    expect(describeIssue("too-long")).toContain("at most 128");
    expect(describeIssue("no-letter")).toContain("letter");
    expect(describeIssue("no-number")).toContain("number");
    expect(describeIssue("no-special")).toContain("special");
    expect(describeIssue("pwned")).toContain("breach");
  });

  it("formats pwned message with count", () => {
    const msg = describeIssue("pwned", 12345);
    expect(msg).toContain("12,345");
    expect(msg).toContain("breach");
  });

  it("returns generic pwned message when count is 0", () => {
    const msg = describeIssue("pwned");
    expect(msg).not.toContain("0");
    expect(msg).toContain("breach");
  });
});

describe("checkPwnedPassword", () => {
  it("returns pwned=true for a known-breached password", async () => {
    // "password" is one of the most breached passwords — guaranteed in HIBP
    const result = await checkPwnedPassword("password");
    expect(result.pwned).toBe(true);
    expect(result.count).toBeGreaterThan(0);
  });

  it("returns pwned=false for a unique random password", async () => {
    // Random string that has effectively never been used anywhere
    const unique = `Zz${Math.random().toString(36).slice(2)}${Date.now()}!Aa1`;
    const result = await checkPwnedPassword(unique);
    expect(result.pwned).toBe(false);
    expect(result.count).toBe(0);
  });

  it("does not send the full hash to HIBP (k-anonymity check)", async () => {
    // Spy on fetch to verify only first 5 hex chars are sent
    const originalFetch = global.fetch;
    let urlSent = "";
    global.fetch = async (input) => {
      urlSent = String(input);
      return originalFetch(input as RequestInfo);
    };
    try {
      await checkPwnedPassword("TestPassword1!");
      // URL should end with /<5 hex chars>, not the full hash
      const match = urlSent.match(/\/([A-F0-9]{5})$/);
      expect(match).not.toBeNull();
      // The full SHA-1 of "TestPassword1!" is much longer than 5 chars
      expect(urlSent.length).toBeLessThan(80);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("adds Add-Padding header for privacy", async () => {
    const originalFetch = global.fetch;
    let headersSent: Record<string, string> = {};
    global.fetch = async (input, init) => {
      headersSent = (init?.headers as Record<string, string>) ?? {};
      return originalFetch(input as RequestInfo, init);
    };
    try {
      await checkPwnedPassword("TestPassword1!");
      expect(headersSent["Add-Padding"]).toBe("true");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("fails open on network error (returns pwned=false with error)", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error("network down");
    };
    try {
      const result = await checkPwnedPassword("TestPassword1!");
      expect(result.pwned).toBe(false);
      expect(result.error).toContain("network down");
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("checkPassword (end-to-end)", () => {
  it("returns ok=false with multiple issues for weak password", async () => {
    const result = await checkPassword("short");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain("too-short");
      expect(result.issues).toContain("no-number");
      expect(result.issues).toContain("no-special");
    }
  });

  it("returns ok=false with pwned issue for a strong-but-breached password", async () => {
    // "Password123!" is strong by our rules (letter + number + special, 12 chars)
    // and is widely breached. We need both: passes strength, fails HIBP.
    const result = await checkPassword("Password123!");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain("pwned");
      expect(result.pwnedCount).toBeGreaterThan(0);
    }
  });

  it("returns ok=true with score for strong unique password", async () => {
    const unique = `Zz${Math.random().toString(36).slice(2)}${Date.now()}!Aa1`;
    const result = await checkPassword(unique);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score).toBeGreaterThanOrEqual(2);
    }
  });

  it("returns ok=false WITHOUT calling HIBP for weak passwords (saves a request)", async () => {
    let hibpCalled = false;
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      hibpCalled = true;
      return originalFetch(...(args as [RequestInfo, RequestInit?]));
    };
    try {
      const result = await checkPassword("weak");
      expect(result.ok).toBe(false);
      expect(hibpCalled).toBe(false); // Strength check short-circuits HIBP
    } finally {
      global.fetch = originalFetch;
    }
  });
});
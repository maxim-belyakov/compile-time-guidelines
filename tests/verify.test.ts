import { describe, it, expect } from "vitest";
import { verify, isVerified, publish, RULES } from "../src/index";

/** A clean post of exactly RULES.maxLength characters (no banned terms). */
const atLimit = "a".repeat(RULES.maxLength);
/** One character over the limit. */
const overLimit = "a".repeat(RULES.maxLength + 1);

describe("verify()", () => {
  it("accepts a clean post and the result is publishable", () => {
    const result = verify("Just shipping a perfectly ordinary status update.");

    expect(result.ok).toBe(true);
    // Narrow the discriminated union, then prove the branded post flows
    // straight into publish() with no cast.
    if (result.ok) {
      const published = publish(result.post);
      expect(published.content).toBe("Just shipping a perfectly ordinary status update.");
      expect(typeof published.id).toBe("string");
    }
  });

  it("rejects a banned term case-insensitively", () => {
    const result = verify("This is total SPAM, do not read it");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("contains banned term: spam");
    }
  });

  it("rejects a multi-word banned term", () => {
    const result = verify("Enter our CRYPTO Giveaway and win big");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("contains banned term: crypto giveaway");
    }
  });

  it("rejects an empty post", () => {
    const result = verify("");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("post must not be empty");
    }
  });

  it("accepts a post at the max-length boundary (280)", () => {
    expect(atLimit.length).toBe(280);
    expect(verify(atLimit).ok).toBe(true);
  });

  it("rejects a post one character over the boundary (281)", () => {
    expect(overLimit.length).toBe(281);

    const result = verify(overLimit);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("post exceeds max length of 280");
    }
  });

  it("reports multiple violations together", () => {
    // Banned term AND over the length limit at the same time.
    const result = verify("spam " + "b".repeat(RULES.maxLength));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("contains banned term: spam");
      expect(result.errors).toContain("post exceeds max length of 280");
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("isVerified()", () => {
  it("returns true for a clean post and false for a violating one", () => {
    expect(isVerified("a friendly hello")).toBe(true);
    expect(isVerified("scam alert")).toBe(false);
    expect(isVerified("")).toBe(false);
  });

  it("narrows a string so it flows into publish()", () => {
    const candidate: string = "a thoroughly unremarkable post";

    // Without the guard, `candidate` is a plain `string` and publish() would
    // reject it at compile time. The guard narrows it to VerifiedPost.
    expect(isVerified(candidate)).toBe(true);
    if (isVerified(candidate)) {
      const published = publish(candidate);
      expect(published.content).toBe(candidate);
    }
  });
});

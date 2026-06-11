/**
 * Runtime verification: the bridge for posts whose text is NOT known at
 * compile time (user input, API payloads, database rows).
 *
 * The compiler cannot inspect a `string` whose value only exists at runtime,
 * so `post()` from compile-time.ts does not help here. Instead, `verify()`
 * reproduces the exact same rules at runtime — reading the SAME `RULES`
 * object the type-level engine reads — and, on success, hands back a branded
 * `VerifiedPost` that `publish()` will accept.
 *
 * The two layers stay in lockstep because there is one source of truth
 * (src/rules.ts) and the checks below mirror src/types.ts rule-for-rule:
 *   - empty post              → ValidatePost short-circuits on `S extends ""`
 *   - banned term (substring) → FindBannedTerm, case-insensitive (Lowercase)
 *   - max length              → ExceedsLength against RULES.maxLength
 */
import { RULES } from "./rules";
import { brand, type VerifiedPost } from "./brand";

/**
 * Discriminated result. On success it carries the branded post ready for
 * `publish()`; on failure it carries every violation found, not just the
 * first — runtime callers usually want to show users all problems at once.
 */
export type VerificationResult =
  | { readonly ok: true; readonly post: VerifiedPost }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Verify an arbitrary runtime string against the community guidelines.
 *
 * Collects ALL violations (the type-level engine short-circuits on the first
 * one because a single failure already makes the literal untypeable; at
 * runtime we have the luxury of a complete report). The error message
 * wording matches the `ValidationError` messages produced by ValidatePost.
 */
export function verify(text: string): VerificationResult {
  const errors: string[] = [];

  if (text === "") {
    errors.push("post must not be empty");
  }

  const haystack = text.toLowerCase();
  for (const term of RULES.bannedTerms) {
    if (haystack.includes(term.toLowerCase())) {
      errors.push(`contains banned term: ${term}`);
    }
  }

  if (text.length > RULES.maxLength) {
    errors.push(`post exceeds max length of ${RULES.maxLength}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, post: brand(text) };
}

/**
 * Type guard: narrows a plain `string` to `VerifiedPost` when it passes
 * verification. After a truthy `isVerified(text)` check, TypeScript treats
 * `text` as `VerifiedPost`, so it flows straight into `publish()` with no
 * cast at the call site.
 */
export function isVerified(text: string): text is VerifiedPost {
  return verify(text).ok;
}

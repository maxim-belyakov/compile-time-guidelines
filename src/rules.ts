/**
 * Community guidelines — the single source of truth.
 *
 * Both the compile-time engine (src/types.ts) and the runtime validator
 * (src/verify.ts) derive their behaviour from this one object, so the two
 * layers can never drift apart.
 *
 * `as const` preserves the literal types ("spam", 280, ...) that the
 * type-level engine needs; `satisfies` checks the shape without widening.
 */
export interface ModerationRules {
  readonly bannedTerms: readonly string[];
  readonly maxLength: number;
}

export const RULES = {
  bannedTerms: ["spam", "scam", "crypto giveaway"],
  maxLength: 280,
} as const satisfies ModerationRules;

export type Rules = typeof RULES;

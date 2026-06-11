/**
 * The type-level verification engine.
 *
 * Everything here is erased at runtime — these types run inside the
 * TypeScript compiler, evaluating community guidelines against string
 * LITERAL types. A post known at compile time that violates the rules
 * simply does not typecheck.
 */
import type { Rules } from "./rules";

type BannedTerms = Rules["bannedTerms"];
type MaxLength = Rules["maxLength"];

/** Case-insensitive substring test via template literal type matching. */
type Contains<S extends string, Term extends string> =
  Lowercase<S> extends `${string}${Lowercase<Term>}${string}` ? true : false;

/**
 * Recursively walks the bannedTerms tuple and resolves to the first term
 * found inside `S`, or `never` when the post is clean.
 */
export type FindBannedTerm<
  S extends string,
  Terms extends readonly string[] = BannedTerms,
> = Terms extends readonly [infer Head extends string, ...infer Rest extends readonly string[]]
  ? Contains<S, Head> extends true
    ? Head
    : FindBannedTerm<S, Rest>
  : never;

/**
 * Length check without computing the full length: consume `S` one character
 * at a time while counting with a tuple accumulator. If the counter reaches
 * `Max` and characters remain, the post is too long. Tail-recursive, so TS
 * evaluates it comfortably for realistic post lengths.
 */
export type ExceedsLength<
  S extends string,
  Max extends number,
  Counter extends readonly unknown[] = [],
> = Counter["length"] extends Max
  ? S extends "" ? false : true
  : S extends `${string}${infer Rest}`
    ? ExceedsLength<Rest, Max, [...Counter, unknown]>
    : false;

/** Descriptive, human-readable compile-time error carrier. */
export type ValidationError<Msg extends string> = { readonly error: Msg };

/**
 * The verdict: resolves to `S` itself when the post is valid, or to a
 * `ValidationError` whose message names the violated rule.
 */
export type ValidatePost<S extends string> =
  S extends ""
    ? ValidationError<"post must not be empty">
    : [FindBannedTerm<S>] extends [never]
      ? ExceedsLength<S, MaxLength> extends true
        ? ValidationError<`post exceeds max length of ${MaxLength}`>
        : S
      : ValidationError<`contains banned term: ${FindBannedTerm<S>}`>;

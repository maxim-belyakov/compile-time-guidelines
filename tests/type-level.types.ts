/**
 * Type-level test suite — these "tests" run inside the TypeScript compiler.
 *
 * Execution: `npm run typecheck` (tsc --noEmit). There are no runtime
 * assertions here; instead:
 *   - `@ts-expect-error` is the assertion "this line MUST fail to compile".
 *     If such a line ever compiles cleanly, tsc reports the directive as
 *     unused and the typecheck fails — so these are real, enforced tests.
 *   - `Expect<Equal<...>>` asserts that ValidatePost resolves to an exact
 *     verdict type.
 *
 * The filename ends in `.types.ts` (not `.test.ts`) specifically so the
 * vitest runner does NOT pick it up — its only runner is the compiler.
 *
 * The two long literals below are exactly 280 and 281 characters: they must
 * be real source characters (not `.repeat()`) so TypeScript evaluates them as
 * literal types, which is what the compile-time engine inspects.
 */
import { post, publish } from "../src/index";
import type { ValidatePost, ValidationError } from "../src/index";

/* ------------------------------------------------------------------ *
 * Equal / Expect helper                                              *
 * ------------------------------------------------------------------ */

/**
 * Exact type equality (not just mutual assignability). The classic
 * function-identity trick: two conditional types are identical iff they
 * relate the same way to every type parameter.
 */
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

/** Compiles only when the argument is exactly `true`. */
type Expect<T extends true> = T;

/* ------------------------------------------------------------------ *
 * post(): valid literals compile and flow into publish()             *
 * ------------------------------------------------------------------ */

// A clean literal verifies and the branded result is accepted by publish().
publish(post("Hello world — a perfectly acceptable post."));

// Exactly 280 characters (the boundary) is allowed.
publish(post("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"));

/* ------------------------------------------------------------------ *
 * post(): every guideline violation is a compile error               *
 * ------------------------------------------------------------------ */

// @ts-expect-error — contains banned term "spam"
post("get rich quick with this spam offer");

// @ts-expect-error — banned term in UPPERCASE (matching is case-insensitive)
post("GET RICH QUICK WITH THIS SPAM OFFER");

// @ts-expect-error — multi-word banned term "crypto giveaway"
post("join the crypto giveaway today");

// @ts-expect-error — empty post is not allowed
post("");

// @ts-expect-error — 281 characters exceeds the 280 max length
post("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

/* ------------------------------------------------------------------ *
 * publish(): the sink rejects anything that is not a VerifiedPost     *
 * ------------------------------------------------------------------ */

// @ts-expect-error — a raw string literal is not a VerifiedPost
publish("this never went through verification");

declare const userInput: string;
// @ts-expect-error — a plain `string` variable is not a VerifiedPost
publish(userInput);

/* ------------------------------------------------------------------ *
 * ValidatePost: exact verdict assertions                             *
 * ------------------------------------------------------------------ */

type _Clean = Expect<Equal<ValidatePost<"a normal post">, "a normal post">>;

type _AtLimit = Expect<Equal<ValidatePost<"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">>;

type _Empty = Expect<
  Equal<ValidatePost<"">, ValidationError<"post must not be empty">>
>;

type _Banned = Expect<
  Equal<ValidatePost<"spam">, ValidationError<"contains banned term: spam">>
>;

type _Multiword = Expect<
  Equal<
    ValidatePost<"a crypto giveaway here">,
    ValidationError<"contains banned term: crypto giveaway">
  >
>;

type _TooLong = Expect<
  Equal<
    ValidatePost<"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">,
    ValidationError<"post exceeds max length of 280">
  >
>;

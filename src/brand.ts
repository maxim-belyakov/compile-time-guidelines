/**
 * Nominal (branded) type for verified posts.
 *
 * The `unique symbol` property cannot be constructed by accident, so the
 * ONLY ways to obtain a `VerifiedPost` are:
 *   1. `post("...")`  — compile-time verification of a string literal
 *   2. `verify(s)`    — runtime verification of an arbitrary string
 *
 * `publish()` accepts only `VerifiedPost`, making "publish an unverified
 * string" a compile error rather than a code-review hope.
 */
declare const verified: unique symbol;

export type VerifiedPost = string & { readonly [verified]: true };

/** Internal: the single place where the brand is applied. */
export function brand(post: string): VerifiedPost {
  return post as VerifiedPost;
}

/**
 * Compile-time entry point: verify a string LITERAL against the guidelines.
 */
import { brand, type VerifiedPost } from "./brand";
import type { ValidatePost, ValidationError } from "./types";

/**
 * When `S` is invalid this resolves to the ValidationError, which is then
 * intersected with `S` in the parameter below. A string literal is never
 * assignable to that intersection, so the call fails to compile — and the
 * compiler error spells out the violated rule, e.g.:
 *
 *   Argument of type '"free crypto giveaway!"' is not assignable to
 *   parameter of type '... & { error: "contains banned term: crypto giveaway" }'
 */
type RejectInvalid<S extends string> =
  ValidatePost<S> extends ValidationError<string> ? ValidatePost<S> : unknown;

/**
 * Verify a compile-time-known post. Valid literals compile and yield a
 * `VerifiedPost`; invalid literals are a type error. The runtime body is a
 * no-op brand application — all checking happened in the compiler.
 */
export function post<S extends string>(text: S & RejectInvalid<S>): VerifiedPost {
  return brand(text);
}

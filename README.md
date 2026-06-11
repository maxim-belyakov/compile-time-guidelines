# Compile-time verification of community guidelines

I model a social platform's community guidelines so that a post which is known
at authoring time and violates the rules **does not typecheck**. The same rules
also run at runtime for posts whose text only exists at runtime (user input, API
payloads), and both paths converge on a single branded `VerifiedPost` type that
the `publish()` sink is the only consumer of.

## Quickstart

```bash
npm install
npm run typecheck   # tsc --noEmit — also runs the type-level test suite
npm test            # vitest — runtime tests
npm run build       # emit to dist/ via tsconfig.build.json
```

`npm run typecheck` is more than a build check: `tsconfig.json` includes
`tests/`, so `tests/type-level.types.ts` is compiled as part of the typecheck.
That file uses `@ts-expect-error` and `Expect<Equal<...>>` assertions, so a rule
regression turns into a failing typecheck rather than a silent pass. The
type-level suite and `npm test` (the runtime suite) together cover both layers.

## How it works

```
                       ┌────────────────────┐
                       │    src/rules.ts     │   single source of truth
                       │  RULES (as const    │   bannedTerms + maxLength
                       │       satisfies)    │
                       └─────────┬───────────┘
              ┌──────────────────┴───────────────────┐
              ▼                                       ▼
   ┌─────────────────────┐               ┌─────────────────────┐
   │   compile-time      │               │      runtime        │
   │   src/types.ts      │               │    src/verify.ts    │
   │   ValidatePost<S>   │               │    verify(text)     │
   │   post("literal")   │               │   isVerified(text)  │
   └──────────┬──────────┘               └──────────┬──────────┘
              │          both produce a branded      │
              └──────────────────┬───────────────────┘
                                 ▼
                       ┌─────────────────────┐
                       │     VerifiedPost     │  unique symbol brand
                       └──────────┬──────────┘
                                  ▼
                       ┌─────────────────────┐
                       │   src/publish.ts    │  publish(p: VerifiedPost)
                       │   the only sink     │  — the access-control point
                       └─────────────────────┘
```

`src/rules.ts` declares `RULES` with `as const satisfies ModerationRules`. The
`as const` preserves the literal types (`"spam"`, `280`) the type-level engine
needs to compute against; `satisfies` checks the shape without widening them.
Both layers read this one object, so they cannot drift.

**`ValidatePost<S>` mechanics (`src/types.ts`).** Given a string literal type
`S`, it resolves to `S` itself when the post is valid, or to a
`ValidationError<Msg>` whose message names the violated rule. It runs three
checks, all in the type system:

- **Banned terms** — `FindBannedTerm<S>` walks the `bannedTerms` tuple
  recursively, peeling off `[Head, ...Rest]` with `infer` and variadic tuples.
  For each term, `Contains<S, Term>` does a case-insensitive substring test by
  asking whether `` Lowercase<S> extends `${string}${Lowercase<Term>}${string}` ``
  — a template literal type where the leading and trailing `${string}` mean "the
  term appears anywhere inside". It resolves to the first matching term, or
  `never` when the post is clean.
- **Length** — `ExceedsLength<S, Max>` never computes the full length. It
  consumes `S` one character at a time (`` S extends `${string}${infer Rest}` ``)
  while counting with a tuple accumulator, and stops as soon as the counter's
  `["length"]` reaches `Max`. If characters still remain at that point, the post
  is too long. It is tail-recursive, so TypeScript evaluates it comfortably for
  realistic post lengths.
- **Empty** — a short-circuit on `S extends ""`.

`post()` (`src/compile-time.ts`) wires this into a call site: its parameter type
intersects `S` with the validation verdict, so an invalid literal is not
assignable and the call fails to compile — and the compiler error spells out the
violated rule.

**Why `VerifiedPost` makes `publish()` the access-control point.**
`VerifiedPost` (`src/brand.ts`) is `string` intersected with a `unique symbol`
property. That property cannot be produced by ordinary code, so the only ways to
obtain a `VerifiedPost` are `post()` (compile-time verification) and `verify()`
(runtime verification) — the two functions that apply the brand after the rules
pass. Because `publish()` accepts only `VerifiedPost`, "publish an unverified
string" is a compile error, not a code-review hope. Verification is enforced by
the type system at the single sink rather than by discipline at every call site.

## Ways to extend TypeScript's type system

One line each; ✅ marks what this solution uses.

| Technique | Used | Where / note |
|---|---|---|
| Generics | ✅ | `post<S>`, `FindBannedTerm<S>`, `ExceedsLength<S, Max>` |
| Conditional types | ✅ | every rule check is `T extends U ? ... : ...` |
| Mapped types | ❌ | not needed — the brand is one computed property, not a mapping |
| Template literal types | ✅ | substring matching and error-message construction |
| Recursive types | ✅ | `FindBannedTerm` (tuple walk) and `ExceedsLength` (char walk) |
| Branded / nominal typing | ✅ | `VerifiedPost` via `unique symbol` |
| Type guards & assertion functions | ✅ | type guard `isVerified()`; no `asserts` function used |
| `satisfies` | ✅ | `RULES` shape-checked without widening literals |
| `const` type parameters | ❌ | I use `as const` on the value instead |
| Declaration merging & module augmentation | ❌ | not used |
| `infer` + variadic tuples | ✅ | `[Head, ...Rest]` term walk, `[...Counter, unknown]` length counter |
| typescript-eslint custom rules (lint-level) | ❌ | could enforce extra policy in the linter |
| Language service plugins (editor-level) | ❌ | could surface richer diagnostics in-editor |
| ts-patch / custom transformers (compile-level) | ❌ | could rewrite or inject checks during emit |
| `tsc` API as a CI verification step | ✅ | `tsc --noEmit` runs the type-level suite (`tests/type-level.types.ts`) |

## How would you verify a user-submitted post with this system?

Honestly: you can't compile-time-verify it. The type-level engine evaluates
string *literal* types, and a user-submitted post is a `string` whose value
exists only at runtime — the compiler has nothing to inspect, so `post()` is the
wrong tool. That's by design, not a gap: the runtime bridge (`src/verify.ts`)
exists for exactly this case. It reads the **same `RULES` object** and mirrors
`ValidatePost` rule-for-rule, then applies the same brand on success, so a
runtime-verified post is indistinguishable from a compile-time-verified one at
the `publish()` boundary.

```ts
import { publish, verify } from "./src";

declare const userInput: string; // e.g. req.body.text

// publish(userInput);
// ^ Compile error: 'string' is not assignable to parameter of type 'VerifiedPost'.

const result = verify(userInput);
if (result.ok) {
  publish(result.post);          // result.post is VerifiedPost — accepted
} else {
  // result.errors: readonly string[] — every violation, ready to return 400.
  // (verify() collects all violations; the type-level engine short-circuits on
  //  the first, since one failure already makes the literal untypeable.)
}
```

**Where it runs.** At the trust boundary where untrusted text enters — the API
edge / pre-publish handler on the server, which is authoritative. A client-side
`isVerified()` check is fine for fast feedback in the UI, but it is advisory; the
server must run `verify()` again before anything reaches `publish()`.

**Trade-offs I'm aware of:**

- **Substring, not regex.** Template literal matching is plain substring
  containment, so `"spam"` is caught but `"sp4m"`, spacing tricks, and other
  evasions are not. Adversarial moderation wants normalization and pattern
  matching, which belongs in `verify()` at runtime, not in the type system.
- **Compiler limits.** Recursive conditional types hit TypeScript's recursion
  and instantiation-depth caps. The length counter is tail-recursive and fine
  for ~280 characters, but the type-level path does not scale to arbitrarily
  long inputs the way the runtime path does — another reason long, untrusted
  text is a runtime concern.
- **When rules outgrow the type system.** ML/toxicity scoring, per-community
  config, or hot-updated rule lists can't live in static types at all. The
  branded architecture survives this cleanly: make `verify()` async
  (`Promise<VerificationResult>`), keep `publish(p: VerifiedPost)` exactly as is,
  and the access-control guarantee is unchanged — only the verifier's internals
  move from the compiler to a service.

## If I had more time

- Add runtime normalization (Unicode confusables, leetspeak, whitespace
  collapsing) before substring matching, so `verify()` resists the evasions the
  substring approach misses — and add adversarial fixtures to lock it in.
- Make `verify()` async and back it with pluggable rule sources (remote config,
  an ML scorer), proving the branded boundary holds when rules move out of the
  type system.
- Add `tsd`/`expect-type`-style coverage and a CI matrix across TypeScript
  versions, so the type-level guarantees are pinned against compiler-behavior
  drift.

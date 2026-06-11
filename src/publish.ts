import type { VerifiedPost } from "./brand";

/**
 * The protected sink. `VerifiedPost` is unconstructible without passing
 * verification, so this signature is the whole security model: raw strings
 * do not compile here.
 */
export function publish(post: VerifiedPost): { id: string; content: VerifiedPost } {
  return { id: crypto.randomUUID(), content: post };
}

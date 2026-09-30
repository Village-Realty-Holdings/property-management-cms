import type { Payload, PayloadRequest } from "payload"

/**
 * What uses a Font. Deleting a Font that something uses is blocked, and the
 * error names every user (the Fonts collection's `beforeDelete`, and the UI
 * through `getFontUsages`).
 *
 * The Theme record doesn't exist yet, so this is a registry: each part of the
 * Site that can pick a Font registers a finder, and the Fonts collection asks
 * them all. The Theme registers its own in Phase 2.
 */

export type FontUsageContext = {
  payload: Payload
  /** Set inside a hook, so a finder's queries join its transaction. */
  req?: PayloadRequest
}

/**
 * Returns human-readable names of what uses the Font with this id, such as
 * "Used by the Theme (heading font)", or an empty list.
 */
export type FontUsageFinder = (
  fontId: number,
  context: FontUsageContext
) => string[] | Promise<string[]>

// Kept on globalThis: Next bundles the config and the routes separately, and
// each bundle would otherwise get its own empty registry.
const REGISTRY = Symbol.for("awayday.site.fontUsageFinders")
type Holder = { [REGISTRY]?: Set<FontUsageFinder> }

function finders(): Set<FontUsageFinder> {
  const holder = globalThis as Holder
  return (holder[REGISTRY] ??= new Set())
}

/** Adds a finder. Returns a function that removes it again. */
export function registerFontUsage(finder: FontUsageFinder): () => void {
  finders().add(finder)
  return () => {
    finders().delete(finder)
  }
}

/** Everything that uses the Font, from every registered finder. */
export async function getFontUsages(
  fontId: number,
  context: FontUsageContext
): Promise<string[]> {
  const found = await Promise.all(
    [...finders()].map((finder) => finder(fontId, context))
  )
  return found.flat()
}

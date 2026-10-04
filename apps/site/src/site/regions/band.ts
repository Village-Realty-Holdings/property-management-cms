import { backgroundOf, surfaces } from "../blocks/BlockSection"
import type { RegionContext } from "./types"

/**
 * What a Footer Block paints when it has a background of its own. Default is
 * the Footer's surface, which the Footer paints, so the Block paints nothing;
 * nor does it inside a Container, which paints for the Blocks it holds.
 */
export function band(
  background: string | null | undefined,
  context: Pick<RegionContext, "surface">
): string | undefined {
  const chosen = backgroundOf(background)
  return chosen === "default" || context.surface !== undefined
    ? undefined
    : surfaces[chosen]
}

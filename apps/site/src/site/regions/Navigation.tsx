import { cn } from "@workspace/ui/lib/utils"

import type { NavigationBlock } from "../../payload-types"
import { linksOf } from "./links"
import { focusOutline, RegionLink } from "./RegionLink"
import type { RegionContext } from "./types"

/**
 * STUB. Only the top-level links, flat: no dropdowns, no mega-menu and no
 * small-screen menu. The navigation-region slice replaces this file with the
 * real menu, keeping the `{ block, context }` props.
 */
export function Navigation({
  block,
}: {
  block: NavigationBlock
  context: RegionContext
}) {
  const links = linksOf(block.items)
  if (links.length === 0) return null
  return (
    <nav aria-label="Main" className="min-w-0 basis-full md:flex-1 md:basis-0">
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {links.map((link) => (
          <li key={link.key}>
            <RegionLink
              href={link.href}
              className={cn(
                "text-sm font-medium text-foreground underline-offset-4 hover:underline",
                focusOutline.page
              )}
            >
              {link.label}
            </RegionLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

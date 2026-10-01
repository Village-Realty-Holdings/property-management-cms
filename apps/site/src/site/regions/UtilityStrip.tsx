import { cn } from "@workspace/ui/lib/utils"

import type { UtilityStripBlock } from "../../payload-types"
import { EditableText } from "../blocks/Editable"
import { container } from "../blocks/types"
import { linksOf } from "./links"
import { focusOutline, RegionLink } from "./RegionLink"
import type { RegionContext } from "./types"

/** A thin strip on the primary colour above the Header: a line of text and a few links. */
export function UtilityStrip({
  block,
  context,
}: {
  block: UtilityStripBlock
  context: RegionContext
}) {
  const text = block.text?.trim()
  const links = linksOf(block.links)
  if (!text && links.length === 0) return null
  return (
    <div className="bg-primary text-primary-foreground">
      <div
        className={cn(
          container,
          "flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 text-sm"
        )}
      >
        {text && (
          <EditableText as="p" field="text" context={context}>
            {text}
          </EditableText>
        )}
        {links.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {links.map((link) => (
              <li key={link.key}>
                <RegionLink
                  href={link.href}
                  className={cn(
                    "underline underline-offset-4 hover:no-underline",
                    focusOutline.primary
                  )}
                >
                  {link.label}
                </RegionLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

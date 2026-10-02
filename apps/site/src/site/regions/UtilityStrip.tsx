import { Phone } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { UtilityStripBlock } from "../../payload-types"
import { backgroundOf, surfaces } from "../blocks/BlockSection"
import { EditableText } from "../blocks/Editable"
import { container } from "../blocks/types"
import { telHref } from "../theme"
import { linksOf } from "./links"
import { focusOutline, RegionLink } from "./RegionLink"
import type { RegionContext } from "./types"

/**
 * A thin strip on the primary colour above the Header: the Brand's phone
 * number to call, a line of text, and a few links. The phone number and the
 * text sit at the start, the links at the end.
 */
export function UtilityStrip({
  block,
  context,
}: {
  block: UtilityStripBlock
  context: RegionContext
}) {
  const text = block.text?.trim()
  const links = linksOf(block.links)
  const phone = block.showPhone ? context.brand.phone : null
  if (!text && !phone && links.length === 0) return null
  // Default is the strip's own look: the Theme's primary colour.
  const background = backgroundOf(block.background)
  return (
    <div
      className={
        background === "default" ? surfaces.primary : surfaces[background]
      }
    >
      <div
        className={cn(
          container,
          "flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 text-sm"
        )}
      >
        {(phone || text) && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {phone && (
              <a
                href={telHref(phone)}
                className={cn(
                  "inline-flex items-center gap-2 font-semibold whitespace-nowrap hover:underline",
                  focusOutline.current
                )}
              >
                <Phone aria-hidden className="size-3.5" />
                {phone}
              </a>
            )}
            {text && (
              <EditableText as="p" field="text" context={context}>
                {text}
              </EditableText>
            )}
          </div>
        )}
        {links.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {links.map((link) => (
              <li key={link.key}>
                <RegionLink
                  href={link.href}
                  className={cn(
                    "underline underline-offset-4 hover:no-underline",
                    focusOutline.current
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

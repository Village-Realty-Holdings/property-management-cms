import { cn } from "@workspace/ui/lib/utils"

import type { LegalBarBlock } from "../../payload-types"
import { container } from "../blocks/types"
import { linksOf } from "./links"
import { focusOutline, RegionLink } from "./RegionLink"
import type { RegionContext } from "./types"

/**
 * The Legal bar's copyright text with `{year}` made the current year and
 * `{name}` the Brand's name. Any other braces are left as typed.
 */
export function expandLegalText(
  text: string,
  name: string,
  year = new Date().getFullYear()
): string {
  // Function replacers, so a `$` in the name is not read as a pattern.
  return text
    .replaceAll("{year}", () => String(year))
    .replaceAll("{name}", () => name)
}

/** The bottom line of the Footer: a copyright notice and legal links. */
export function LegalBar({
  block,
  context,
}: {
  block: LegalBarBlock
  context: RegionContext
}) {
  const text = expandLegalText(block.text ?? "", context.brand.name).trim()
  const links = linksOf(block.links)
  if (!text && links.length === 0) return null
  return (
    <div className="border-t border-border">
      <div
        className={cn(
          container,
          "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-sm"
        )}
      >
        {text && <p>{text}</p>}
        {links.length > 0 && (
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map((link) => (
              <li key={link.key}>
                <RegionLink
                  href={link.href}
                  className={cn(
                    "underline-offset-4 hover:underline",
                    focusOutline.secondary
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

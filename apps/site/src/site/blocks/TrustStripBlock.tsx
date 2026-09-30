import { cn } from "@workspace/ui/lib/utils"

import type { TrustStripBlock as TrustStripBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, backgroundOf } from "./BlockSection"
import { EditableText } from "./Editable"
import {
  TrustItems,
  TrustLogos,
  trustItemsOf,
  trustLogosOf,
  type TrustSurface,
} from "./TrustItems"
import type { BlockContext } from "./types"

/**
 * Trust strip: text or stat items, or partner logos. The heading is
 * optional, so a strip without one is a region named "Trust strip". With
 * nothing to show (no items, or no logos for the logo variant) and no
 * heading, it renders nothing.
 */
export function TrustStripBlock({
  block,
  context,
}: {
  block: TrustStripBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  const id = `block-${context.index}-heading`
  const logos = block.variant === "logos"
  const items = logos ? [] : trustItemsOf(block.items)
  const partners = logos ? trustLogosOf(block.logos) : []
  if (!heading && items.length === 0 && partners.length === 0) return null

  const background = backgroundOf(block.background)
  const surface: TrustSurface =
    background === "primary" || background === "dark" ? background : "page"

  return (
    <BlockSection
      background={block.background}
      labelledBy={heading ? id : undefined}
      label="Trust strip"
      className="flex flex-col gap-8"
    >
      {heading && (
        <EditableText
          as="h2"
          field="heading"
          context={context}
          id={id}
          className={cn(displayFont, "text-2xl text-balance sm:text-3xl")}
        >
          {heading}
        </EditableText>
      )}
      {items.length > 0 && <TrustItems items={items} surface={surface} />}
      {partners.length > 0 && <TrustLogos logos={partners} />}
    </BlockSection>
  )
}

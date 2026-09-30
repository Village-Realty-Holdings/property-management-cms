import type { HeroBlock as HeroBlockData } from "../../payload-types"
import { imageOf } from "../brand"
import { BlockButton, linkOf } from "./BlockButton"
import { HeroShell } from "./HeroShell"
import type { BlockContext } from "./types"
import { TrustItems, trustItemsOf } from "./TrustItems"

/**
 * Hero: the Page's opening statement. With an image it's a full-bleed photo
 * with the heading over a shade; without, the Site's primary colour with an
 * accent glow. An eyebrow line sits above the heading, one word of which can
 * be set in the accent style, and a trust strip can be fused to its foot.
 */
export function HeroBlock({
  block,
  context,
}: {
  block: HeroBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const cta = linkOf(block.cta)
  const image = imageOf(block.image)
  const strip = trustItemsOf(block.trustStrip)

  return (
    <HeroShell
      eyebrow={block.eyebrow}
      heading={heading}
      accentWord={block.accentWord}
      subheading={block.subheading}
      image={image}
      context={context}
      foot={
        strip.length > 0 && (
          <TrustItems
            items={strip}
            surface={image ? "dark" : "primary"}
            label="Highlights"
            inset
          />
        )
      }
    >
      {cta && (
        <div>
          <BlockButton
            link={cta}
            tone="accent"
            surface={image ? "dark" : "primary"}
            editable={{ field: "cta.label", context }}
          />
        </div>
      )}
    </HeroShell>
  )
}

import { cn } from "@workspace/ui/lib/utils"

import type { ButtonBlock as ButtonBlockData } from "../../payload-types"
import {
  BlockButton,
  linkOf,
  type BlockButtonTone,
  type BlockSurface,
} from "./BlockButton"
import { BlockSection, surfaceOf } from "./BlockSection"
import type { BlockContext } from "./types"

const aligns: Record<ButtonBlockData["align"], string> = {
  start: "justify-start",
  centre: "justify-center",
  end: "justify-end",
}

/**
 * Button: one link drawn as a button, at the start, the centre or the end of
 * its line. It has no background of its own: on the Page it sits on the
 * Default one, and in a Container on the Container's.
 *
 * Primary is the Theme's button. On the Primary and Dark surfaces that
 * button would be the surface's own colour, or unreadable on it, so there it
 * is drawn from the surface's text colour. Outline takes the colour of the
 * text around it on every surface.
 */
export function ButtonBlock({
  block,
  context,
}: {
  block: ButtonBlockData
  context: BlockContext
}) {
  const link = linkOf(block.link)
  if (!link) return null
  const background = surfaceOf(undefined, context)
  const surface: BlockSurface | undefined =
    background === "primary" || background === "dark" ? background : undefined
  const tones: Record<ButtonBlockData["style"], BlockButtonTone> = {
    primary: surface ? "inverse" : "primary",
    accent: "accent",
    outline: "outline",
  }
  return (
    // The section is a region, so it needs a name: what the button says.
    <BlockSection background={background} label={link.label}>
      <div className={cn("flex", aligns[block.align] ?? aligns.start)}>
        <BlockButton
          link={link}
          tone={tones[block.style] ?? tones.primary}
          surface={surface}
          editable={{ field: "link.label", context }}
        />
      </div>
    </BlockSection>
  )
}

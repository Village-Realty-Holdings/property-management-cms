import { CallToActionBlock } from "./CallToActionBlock"
import { HeroBlock } from "./HeroBlock"
import { RichTextBlock } from "./RichTextBlock"
import type { PageBlock } from "./types"

export type { PageBlock } from "./types"

/**
 * Renders one of a Page's Blocks. The Visual Editor will render Blocks with
 * this same component, so the Admin and the Site always agree.
 */
export function Block({ block, index }: { block: PageBlock; index: number }) {
  const context = { index }
  switch (block.blockType) {
    case "hero":
      return <HeroBlock block={block} context={context} />
    case "richText":
      return <RichTextBlock block={block} />
    case "callToAction":
      return <CallToActionBlock block={block} context={context} />
    default:
      return null
  }
}

/** A Page's Blocks, in order. */
export function Blocks({ blocks }: { blocks: PageBlock[] | null | undefined }) {
  return (
    <>
      {(blocks ?? []).map((block, index) => (
        <Block key={block.id ?? index} block={block} index={index} />
      ))}
    </>
  )
}

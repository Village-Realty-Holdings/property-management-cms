import { fixturesFor, type SiteFixtures } from "../fixtures"
import { renderBlock } from "./registry"
import type { PageBlock } from "./types"

export type { BlockContext, PageBlock } from "./types"

/**
 * Renders one of a Page's Blocks from the registry. The Visual Editor
 * renders Blocks with this same component, so the Admin and the Site always
 * agree. `fixtures` are the Site's Rentals and blog posts; `editing` marks
 * the Visual Editor's canvas (see `EditableText`).
 */
export function Block({
  block,
  index,
  fixtures,
  editing = false,
}: {
  block: PageBlock
  index: number
  fixtures?: SiteFixtures
  editing?: boolean
}) {
  return renderBlock(block, {
    index,
    fixtures: fixtures ?? fixturesFor(undefined),
    editing,
  })
}

/** A Page's Blocks, in order. */
export function Blocks({
  blocks,
  fixtures,
  editing,
}: {
  blocks: PageBlock[] | null | undefined
  fixtures?: SiteFixtures
  editing?: boolean
}) {
  return (
    <>
      {(blocks ?? []).map((block, index) => (
        <Block
          key={block.id ?? index}
          block={block}
          index={index}
          fixtures={fixtures}
          editing={editing}
        />
      ))}
    </>
  )
}

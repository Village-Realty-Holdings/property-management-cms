import type { Block, ContentAdapter, PageDoc } from "@workspace/content/queries"

import { FormBlock } from "../forms/FormBlock"

import { AnnouncementBlock } from "./announcement-block"
import { AudienceBlock } from "./audience-block"
import { CallToActionBlock } from "./call-to-action-block"
import { ContactBlock } from "./contact-block"
import { CuratedListCardsBlock } from "./curated-list-cards-block"
import { FaqBlock } from "./faq-block"
import { HeroBlock } from "./hero-block"
import { str } from "./lib"
import { PropertyGridBlock } from "./property-grid-block"
import { RichTextBlock } from "./rich-text-block"
import type { BlockContext, BlockRenderer, BlockSite } from "./types"

export type {
  BlockContext,
  BlockRenderer,
  BlockRendererProps,
  BlockSite,
} from "./types"

/**
 * Block slug (`blockType`, see apps/cms src/blocks) → renderer. Each renderer
 * takes `{ block, context }` (BlockRendererProps), reads its own fields
 * defensively and returns null when there's nothing to show.
 */
export const blockRenderers: Partial<Record<string, BlockRenderer>> = {
  hero: HeroBlock,
  richText: RichTextBlock,
  propertyGrid: PropertyGridBlock,
  curatedListCards: CuratedListCardsBlock,
  callToAction: CallToActionBlock,
  faq: FaqBlock,
  form: ({ block }) => <FormBlock block={block} />,
  // The Tuck-In Page Template's Blocks.
  announcement: AnnouncementBlock,
  audience: AudienceBlock,
  contact: ContactBlock,
}

/** Whether the first Block opens the Page with its own h1 (a Hero or an Announcement). */
export const opensWithHero = (blocks: Block[]) =>
  (blocks[0]?.blockType === "hero" && str(blocks[0].heading) !== null) ||
  (blocks[0]?.blockType === "announcement" && str(blocks[0].headline) !== null)

/**
 * A Page's layout, Block by Block. Unknown Block types render nothing
 * (logged in development, so a new CMS Block without a renderer is noticed).
 */
export function RenderBlocks({
  page,
  isHome,
  mediaBaseUrl,
  site,
  content,
}: {
  page: PageDoc
  isHome: boolean
  mediaBaseUrl: string | null
  site: BlockSite
  content: ContentAdapter
}) {
  return page.blocks.map((block, index) => {
    const Renderer = blockRenderers[block.blockType]
    if (!Renderer) {
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[blocks] No renderer for Block "${block.blockType}" on Page "${page.path}"; skipped.`
        )
      }
      return null
    }
    const context: BlockContext = {
      page,
      index,
      isHome,
      mediaBaseUrl,
      site,
      content,
    }
    const key =
      typeof block.id === "string" ? block.id : `${block.blockType}-${index}`
    return <Renderer key={key} block={block} context={context} />
  })
}

import { createElement } from "react"

import { AmenitiesBlock } from "./AmenitiesBlock"
import { BlogTeaserBlock } from "./BlogTeaserBlock"
import { ButtonBlock } from "./ButtonBlock"
import { CallToActionBlock } from "./CallToActionBlock"
import { ContainerBlock } from "./ContainerBlock"
import { FaqBlock } from "./FaqBlock"
import { FeaturedRentalsBlock } from "./FeaturedRentalsBlock"
import { FeaturesBlock } from "./FeaturesBlock"
import { FormBlock } from "./FormBlock"
import { GuestSurveyBlock } from "./GuestSurveyBlock"
import { HeroBlock } from "./HeroBlock"
import { ImageBlock } from "./ImageBlock"
import { ImageTextBlock } from "./ImageTextBlock"
import { LargeGroupRentalsBlock } from "./LargeGroupRentalsBlock"
import { LocationBlock } from "./LocationBlock"
import { NewsletterBlock } from "./NewsletterBlock"
import { OwnerBandBlock } from "./OwnerBandBlock"
import { RentalGridBlock } from "./RentalGridBlock"
import { RichTextBlock } from "./RichTextBlock"
import { SearchHeroBlock } from "./SearchHeroBlock"
import { StatsBlock } from "./StatsBlock"
import { StepsBlock } from "./StepsBlock"
import { TestimonialsBlock } from "./TestimonialsBlock"
import { TrustStripBlock } from "./TrustStripBlock"
import { withBlockStyle } from "./style"
import type {
  BlockComponent,
  BlockContext,
  BlockOf,
  BlockType,
  PageBlock,
} from "./types"

/**
 * Every Block's render function, by the `blockType` a Page stores it under.
 * The mapped type makes the compiler ask for a component whenever a Block
 * is added to the Payload config. Used by `Block`, so the public Site, the
 * Visual Editor's canvas and the catalogue all draw a Block the same way.
 */
export const blockRegistry: { [T in BlockType]: BlockComponent<BlockOf<T>> } = {
  hero: HeroBlock,
  searchHero: SearchHeroBlock,
  richText: RichTextBlock,
  callToAction: CallToActionBlock,
  featuredRentals: FeaturedRentalsBlock,
  largeGroupRentals: LargeGroupRentalsBlock,
  rentalGrid: RentalGridBlock,
  steps: StepsBlock,
  features: FeaturesBlock,
  amenities: AmenitiesBlock,
  stats: StatsBlock,
  imageText: ImageTextBlock,
  testimonials: TestimonialsBlock,
  trustStrip: TrustStripBlock,
  ownerBand: OwnerBandBlock,
  newsletter: NewsletterBlock,
  blogTeaser: BlogTeaserBlock,
  location: LocationBlock,
  faq: FaqBlock,
  form: FormBlock,
  guestSurvey: GuestSurveyBlock,
  button: ButtonBlock,
  image: ImageBlock,
  container: ContainerBlock,
}

/**
 * Renders a Block from the registry: its component with `(block, context)`,
 * or nothing when the stored `blockType` is not one the Site has (a Block
 * removed since the Page was saved).
 */
export function renderBlock(block: PageBlock, context: BlockContext) {
  if (!Object.hasOwn(blockRegistry, block.blockType)) return null
  const Component = blockRegistry[block.blockType] as BlockComponent
  // The Block's own style (an Accent or Third background, a set text colour)
  // is around it, not in it: see `withBlockStyle`.
  return withBlockStyle(
    createElement(Component, { block, context }),
    block,
    context
  )
}

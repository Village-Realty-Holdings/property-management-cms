import React from 'react'

import type { Page } from '@/payload-types'

import { AmenitiesBlock } from '@/blocks/Amenities/Component'
import { AreaGuideBlock } from '@/blocks/AreaGuide/Component'
import { AvailabilitySearchBlock } from '@/blocks/AvailabilitySearch/Component'
import { BookingStepsBlock } from '@/blocks/BookingSteps/Component'
import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FAQBlock } from '@/blocks/FAQ/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { GalleryBlock } from '@/blocks/Gallery/Component'
import { HeroBlock, isFullBleedHero } from '@/blocks/Hero/Component'
import { LocationBlock } from '@/blocks/Location/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { NewsletterBlock } from '@/blocks/Newsletter/Component'
import { OwnerCtaBlock } from '@/blocks/OwnerCta/Component'
import { PricingBlock } from '@/blocks/Pricing/Component'
import { PromosBlock } from '@/blocks/Promos/Component'
import { PropertyDetailBlock } from '@/blocks/PropertyDetail/Component'
import { PropertyListingBlock } from '@/blocks/PropertyListing/Component'
import { ReviewsFeedBlock } from '@/blocks/ReviewsFeed/Component'
import { SectionBlock } from '@/blocks/Section/Component'
import { TestimonialsBlock } from '@/blocks/Testimonials/Component'
import { cn } from '@/lib/ui'

const blockComponents = {
  amenities: AmenitiesBlock,
  archive: ArchiveBlock,
  areaGuide: AreaGuideBlock,
  availabilitySearch: AvailabilitySearchBlock,
  bookingSteps: BookingStepsBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  faq: FAQBlock,
  formBlock: FormBlock,
  gallery: GalleryBlock,
  hero: HeroBlock,
  location: LocationBlock,
  mediaBlock: MediaBlock,
  newsletter: NewsletterBlock,
  ownerCta: OwnerCtaBlock,
  pricing: PricingBlock,
  promos: PromosBlock,
  propertyDetail: PropertyDetailBlock,
  propertyListing: PropertyListingBlock,
  reviewsFeed: ReviewsFeedBlock,
  section: SectionBlock,
  testimonials: TestimonialsBlock,
}

type Props = {
  blocks: Page['layout'][0][]
}

/**
 * Renders the page's blocks with one shared vertical rhythm. Blocks own
 * their horizontal layout only; the gap between them lives here.
 *
 * A hero is a block like any other. When the page opens with a full-bleed
 * hero, a search block right after it overlaps the hero's bottom edge.
 */
export const RenderBlocks: React.FC<Props> = ({ blocks }) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return null

  const opensWithHero = blocks[0]?.blockType === 'hero'
  const overlapSecond = isFullBleedHero(blocks[0]) && blocks[1]?.blockType === 'availabilitySearch'

  return (
    <div className={cn('flex flex-col gap-16 md:gap-24', !opensWithHero && 'mt-12 md:mt-16')}>
      {blocks.map((block, index) => {
        const { blockType } = block
        if (!blockType || !(blockType in blockComponents)) return null
        const Block = blockComponents[blockType]

        // The negative margin also has to swallow the flex gap above the block.
        const raised = overlapSecond && index === 1
        return (
          <div key={index} className={cn(raised && 'relative z-10 -mt-36 md:-mt-48')}>
            {/* @ts-expect-error there may be some mismatch between the expected types here */}
            <Block {...block} raised={raised} />
          </div>
        )
      })}
    </div>
  )
}
